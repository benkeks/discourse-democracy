# DiscourseDemocracy

DiscourseDemocracy is adds proxy voting and quora for polls.

## Installation

Follow [Install a Plugin](https://meta.discourse.org/t/install-a-plugin/19157)
how-to from the official Discourse Meta, using `git clone https://github.com/benkeks/discourse-democracy.git`
as the plugin command.

## Usage

### Enhanced Polls

Enabling the plugin will change poll results to display absolute numbers of votes instead of percentages.

* `[delegate=1.0]` in a *poll title* will enable proxy voting for public polls (i.e. polls with “show who voted” ticked). The supplied float determines the weight of proxy votes. E.g. `[delegate=0.5]` will make proxy votes count half as much as conventioanl votes in this poll.
* `[min=10]` in a *poll option text* will set a quroum (of 10) for an option.
* `[fill=10]` in a *poll option text* will add virtual votes to an option if the overall participation is below the number (10, in the example).

For example, the following code generates a poll with proxy voting and a 25-vote quroum for `Yes`.

```
[poll type=regular results=always name=poll1 public=true chartType=bar]
# Should we do X? [delegate=1.0]
* Yes [min=25]
* No
* Abstain
[/poll]
```
Here, a poll where proxy votes count for half a direct vote and difference to 10 participation votes is added to `Abstain`.

```
[poll type=regular results=always name=poll1 public=true chartType=bar]
# Should we do Y? [delegate=0.5]
* Yes
* No
* Abstain [fill=10]
[/poll]
```

### Naming Proxies

Every user can name a proxy who may cast votes on their behalf (in [delegate=x.y] polls) in their profile at `/my/delegations`. Under this route for other users, logged-in users may also see whose votes the user carries.

The delegations are not transitive. That is, votes delegated to some user cannot be passed on by the user.

Direct votes dominate indirect ones. So if a user votes in a poll where their proxy votes too, only the direct vote counts and the proxied vote is shadowed.

Changes to the delegations after the proxy has voted in a poll do not affect the count in the poll. (But if the proxy re-casts their vote, the changed delegations will take effect.)

## Limitations

* This is a first prototype---and the very first thing I'v ever implemented with Discourse/Rails/Ember. So it should not be used for giant and important polls in production.
* The plugin does a lot of its counting in the client. Therefore, the vote results cannot easily be accessed from other directions. (The reason is that I did not find a good way of extending the Polls-Plugin backend from within another plugin.)
* For now, group restrictions of polls are not taken into consideration when adding proxy votes.
* For now, there are no categories/types of delegations. However, the custom fields in the backend already have a layer for different kinds of delegation (for now, there implicitly is only one category `*`).

## Feedback

If you have issues or suggestions for the plugin, please bring them up on
[Discourse Meta](https://meta.discourse.org).
