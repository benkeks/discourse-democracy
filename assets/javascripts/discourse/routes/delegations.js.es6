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
    this.controllerFor('delegations').setProperties({
      delegations: (model.delegations['*'] || []).map(u => u.username),
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
