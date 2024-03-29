import { withPluginApi } from "discourse/lib/plugin-api";

import RawHtml from "discourse/widgets/raw-html";
import evenRound from "discourse/plugins/poll/lib/even-round";
import { h } from "virtual-dom";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import { avatarFor } from "discourse/widgets/post";

function optionHtml(option) {
  const $node = $(`<span>${option.html}</span>`);

  $node.find(".discourse-local-date").each((_index, elem) => {
    $(elem).applyLocalDates();
  });

  return new RawHtml({ html: `<span>${$node.html()}</span>` });
}

function initializeDiscourseDemocracy(api) {

  api.replaceIcon('notification.democracy_delegation', 'random');

  api.reopenWidget('discourse-poll', {
    init(attrs) {

      attrs.poll.options.forEach(op => {
        // parse min quora and and fill-up targets from the option html
        op.html = op.html
            .replace(/\[min\s*=\s*(\d+)\s*]/g, (match, number) => {op.min = parseInt(number); return ""})
            .replace(/\[fill\s*=\s*(\d+)\s*]/g, (match, number) => {op.fill = parseInt(number); return ""});

        // create fields for user-side vote counting
        op.directVotes = op.votes;
        op.indirectVotes = op.indirectVotes || 0;
        op.fillupVotes = op.fillupVotes || 0;
        op.summedVotes = op.summedVotes || 0;
      });

      // parse delegation weights from title (and remove it from title html)
      attrs.delegatedVoteWeight || (attrs.delegatedVoteWeight = 0);
      if (attrs.poll.title) {
        attrs.poll.title = attrs.poll.title.replace(/\[delegate\s*=\s*(\d+\.\d+)\s*]/g,
          (match, number) => {attrs.delegatedVoteWeight = parseFloat(number); return ""});
        attrs.titleHTML = attrs.titleHTML.replace(/\[delegate\s*=\s*(\d+\.\d+)\s*]/g, "");
      }
    }
  });

  api.reopenWidget('discourse-poll-standard-results', {
    tagName: "ul.results",
    buildKey: (attrs) => `poll-standard-results-${attrs.id}`,

    fetchDelegatedVotes(postId, poll, delegatedVoteWeight) {
      ajax(`/discourse-democracy/delegations/poll/${postId}.json`).catch((error) => {
        if (error) {
          popupAjaxError(error);
        } else {
          bootbox.alert(I18n.t("poll.error_while_fetching_voters"));
        }
      }).then((result) => {
        this.state.delegatedVotes = result[poll.name];
        const options = poll.options;
        options.forEach(op => op.indirectVotes = 0);
        this.state.delegatedVotes.forEach(vote => {
          const id = vote.parent_vote.digest;
          const voteOption = options.find(ov => ov.id === id);
          if (voteOption) {
            voteOption.indirectVotes += delegatedVoteWeight * vote.delegated_votes.length;
          }
        });

        this.scheduleRerender();
      });
    },

    html(attrs, state) {
      const { poll, post, delegatedVoteWeight } = attrs;
      const options = poll.options;

      if (options) {
        const isPublic = poll.public;
        const optionsWithVotes = [...options];

        if (isPublic) {
          state.voters = poll.preloaded_voters;
          state.loading = false;
        }

        if (delegatedVoteWeight > 0 && !state.delegatedVotes) {
          this.fetchDelegatedVotes(post.id, poll, delegatedVoteWeight);
        }

        const receivedVotes = optionsWithVotes.reduce((sum, op) => sum + op.directVotes + op.indirectVotes, 0);
        let virtualVoters = 0;
        optionsWithVotes.forEach(op => {
          if (op.fill && receivedVotes <= op.fill) {
            op.fillupVotes = (op.fill - receivedVotes);
          }
          op.summedVotes = op.directVotes + op.indirectVotes + op.fillupVotes;
          virtualVoters += op.summedVotes;
        });

        optionsWithVotes.forEach(op => {
          if (op.min && virtualVoters <= op.min) virtualVoters = op.min;
        });

        const ordered = optionsWithVotes.sort((a, b) => {
          if (a.displayVotes < b.displayVotes) {
            return 1;
          } else if (a.displayVotes === b.displayVotes) {
            if (a.html < b.html) {
              return -1;
            } else {
              return 1;
            }
          } else {
            return -1;
          }
        });
  
        const percentages =
          virtualVoters === 0
            ? Array(ordered.length).fill(0)
            : ordered.map((o) => (100 * o.summedVotes) / virtualVoters);
  
        const rounded = attrs.isMultiple
          ? percentages.map(Math.floor)
          : evenRound(percentages);
  
        return ordered.map((option, idx) => {
          const contents = [];
          const per = rounded[idx].toString();
          const chosen = (attrs.vote || []).includes(option.id);
  
          const voteNumbers = [h("span.percentage", `${option.summedVotes}`)];
          if (option.fillupVotes > 0) voteNumbers.push(h("span.percentage.fillupVotes", `${option.fillupVotes}`));
          if (option.indirectVotes > 0) voteNumbers.push(h("span.percentage.indirectVotes", `${option.indirectVotes}`));
          if (option.directVotes > 0 && voteNumbers.length > 1) voteNumbers.push(h("span.percentage.directVotes", `${option.directVotes}`));
          voteNumbers.push(optionHtml(option));

          contents.push(
            h(
              "div.option",
              h("p", voteNumbers)));
  
          contents.push(
            h(
              "div.bar-back",
              h("div.bar", { attributes: { style: `width:${per}%` } })
            )
          );

          if (option.min) {
            contents.push(
              h(
                "div.bar-back",
                h("div.bar-quorum", { attributes: { style: `width:${100.0 * option.min / virtualVoters}%` } })
              )
            );
          }
  
          if (isPublic) {
            contents.push(
              this.attach("discourse-poll-voters", {
                postId: attrs.post.id,
                optionId: option.id,
                pollName: poll.name,
                totalVotes: option.votes,
                voters: (state.voters && state.voters[option.id]) || [],
                delegatedVotes: state.delegatedVotes || []
              })
            );
          }
  
          return h("li", { className: `${chosen ? "chosen" : ""}` }, contents);
        });
      }
    }
  })


  api.reopenWidget("discourse-poll-voters", {
    html(attrs, state) {
      if (attrs.voters) {
        state.voters = attrs.voters;
      }

      // inject delegated votes into voter display
      const displayVoters = [...state.voters];
      attrs.delegatedVotes.forEach(vote => {
        const id = vote.parent_vote.digest;
        if (attrs.optionId == id) {
          const proxyId = vote.parent_vote.user_id;
          vote.delegated_votes.forEach(dv => dv.isDelegatedVote = true);
          displayVoters.splice(displayVoters.findIndex(ovt => ovt.id === proxyId)+1, 0, ...vote.delegated_votes);
        }
      });

      const contents = displayVoters.map((user) => {
        return h("li" + (user.isDelegatedVote ? ".delegated" : "") , [
          avatarFor("tiny", {
            username: user.username,
            template: user.avatar_template,
          }),
          " ",
        ]);
      });

      if (state.voters.length < attrs.totalVotes) {
        contents.push(this.attach("discourse-poll-load-more", attrs));
      }

      return h("div.poll-voters", contents);
    },
  });
}

export default {
  name: "discourse-democracy",

  initialize() {
    withPluginApi("0.8.31", initializeDiscourseDemocracy);
  }
};
