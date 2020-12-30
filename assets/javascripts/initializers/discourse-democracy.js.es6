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

  api.reopenWidget('discourse-poll-standard-results', {
    tagName: "ul.results",
    buildKey: (attrs) => `poll-standard-results-${attrs.id}`,

    html(attrs, state) {
      const { poll, post } = attrs;
      const options = poll.get("options");
      const delegatedVoteWeight = 0.5;

      if (options) {
        let voters = poll.get("voters");
        const isPublic = poll.get("public");
        const optionsWithVotes = [...options];

        console.log("options:");
        console.log(optionsWithVotes);

        optionsWithVotes.forEach(op => {
          // parse min quora and and fill-up targets from the option html
          op.html = op.html
            .replaceAll(/\[min\s*=\s*(\d+)\s*]/g, (match, number) => {op.min = parseInt(number); return ""})
            .replaceAll(/\[fill\s*=\s*(\d+)\s*]/g, (match, number) => {op.fill = parseInt(number); return ""});

          op.directVotes = op.votes;
          op.indirectVotes = op.indirectVotes || 0;
          op.fillupVotes = op.fillupVotes || 0;
          op.summedVotes = op.summedVotes || 0;
        });

        if (isPublic && !state.loaded) {
          state.voters = poll.get("preloaded_voters");
          console.log(state.voters);

          state.delegatedVotes = state.delegatedVotes || post.polls_delegated_votes[poll.get("name")];

          console.log("delegated:");
          console.log(state.delegatedVotes);
          state.delegatedVotes.forEach(vote => {
            const id = vote.parent_vote.digest;
            const proxyId = vote.parent_vote.user_id;
            vote.delegated_votes.forEach(dv => dv.isDelegatedVote = true);
            const interMediateVoters = state.voters[id];
            if (interMediateVoters) {
              interMediateVoters.splice(interMediateVoters.findIndex(ovt => ovt.id === proxyId)+1, 0, ...vote.delegated_votes);
            }
            const voteOption = optionsWithVotes.find(ov => ov.id === id);
            if (voteOption) {
              voteOption.indirectVotes += delegatedVoteWeight * vote.delegated_votes.length;
              voters += delegatedVoteWeight * vote.delegated_votes.length;
            }
            state.delegatedVotes = [];
            poll.set("voters", voters);
          });

          state.loaded = true;
        } else {
          state.delegatedVotes = [];
        }

        let virtualVoters = 0;

        optionsWithVotes.forEach(op => {
          if (op.fill && voters <= op.fill) {
            op.fillupVotes = (op.fill - voters);
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
  
          if (isPublic) {
            contents.push(
              this.attach("discourse-poll-voters", {
                postId: attrs.post.id,
                optionId: option.id,
                pollName: poll.get("name"),
                totalVotes: option.votes,
                voters: (state.voters && state.voters[option.id]) || [],
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
      if (attrs.voters && state.loaded === "new") {
        state.voters = attrs.voters;
      }

      const contents = state.voters.map((user) => {
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
