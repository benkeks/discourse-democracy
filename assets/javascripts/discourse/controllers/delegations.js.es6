import { action } from "@ember/object";
import Controller from "@ember/controller";

import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import ModalFunctionality from "discourse/mixins/modal-functionality";

export default Controller.extend(ModalFunctionality, {
  model: "",
  
  @action
  setProxyNames(_, proxies) {
    let proxyName = proxies[0]?.username || "";
    let newDelegations = proxyName === "" ? [] : [proxyName];
    return ajax(`/discourse-democracy/delegations/delegate`, {
      data: { proxy_name: proxyName, user_name: this.username, delegation_type: "*"},
      type: "PUT",
    })
      .catch(popupAjaxError)
      .then(() => this.set("delegations", newDelegations))
  },
});
