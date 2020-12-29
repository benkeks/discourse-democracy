import { action } from "@ember/object";
import Controller from "@ember/controller";

import { extractError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import ModalFunctionality from "discourse/mixins/modal-functionality";

export default Controller.extend(ModalFunctionality, {
  proxyName: null,
  model: null,
  
  @action
  setProxyNames(_, proxyNames) {
    this.set("proxyName", proxyNames[0]);
  },

  @action
  delegate() {
    return ajax(`/discourse-democracy/delegations/delegate`, {
      data: { proxy_name: this.proxyName || "", user_name: this.username, delegation_type: "*"},
      type: "PUT",
    })
      .catch((e) => this.flash(extractError(e), "error"));
  }
});