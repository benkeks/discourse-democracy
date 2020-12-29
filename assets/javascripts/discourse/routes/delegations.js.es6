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
    console.log(model)
    this.controllerFor('delegations').setProperties({
      delegations: (model.delegations['*'] || []).map(u => u.username),
      mandates: model.mandates['*'] || [],
      username: this.paramsFor('user').username
    });
  },

  renderTemplate() {
    this.render("delegations");
  }
});
