import DiscourseRoute from 'discourse/routes/discourse'

import { ajax } from 'discourse/lib/ajax';

export default DiscourseRoute.extend({
  controllerName: "delegations",

  model(params) {
    return ajax(`/discourse-democracy/delegations/list/${this.paramsFor('user').username}.json`, {
      type: 'GET'
    });
  },

  setupController(controller, model) {
    const mandates = model.mandates['*'] || [];
    const delegationUsers = model.delegations['*'] || [];
    this.controllerFor('delegations').setProperties({
      delegations: delegationUsers.map(u => u.username),
      delegationUsers: delegationUsers,
      hasProxy: delegationUsers.length > 0,
      mandates: mandates,
      anyMandates: mandates.length > 0,
      username: this.paramsFor('user').username,
      showSelection: (this.paramsFor('user').username == controller.currentUser.username) || controller.currentUser.get("staff")
    });
  },

  renderTemplate() {
    this.render("delegations");
  },

  afterModel(user) {
    if (
      !(this.currentUser)
    ) {
      this.transitionTo("user");
    }
  },
});
