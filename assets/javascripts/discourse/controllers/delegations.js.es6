import { action } from "@ember/object";
import Controller from "@ember/controller";

import { popupAjaxError } from "discourse/lib/ajax-error";
//import { extractError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import ModalFunctionality from "discourse/mixins/modal-functionality";

export default Controller.extend(ModalFunctionality, {
  model: null,
  
  @action
  setProxyNames(_, proxyNames) {
    let proxyName = proxyNames[0];
    return ajax(`/discourse-democracy/delegations/delegate`, {
      data: { proxy_name: proxyName || "", user_name: this.username, delegation_type: "*"},
      type: "PUT",
    })
      .catch(popupAjaxError);
  },
});