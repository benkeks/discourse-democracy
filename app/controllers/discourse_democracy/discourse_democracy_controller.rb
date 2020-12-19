module DiscourseDemocracy
  class DiscourseDemocracyController < ::ApplicationController
    requires_plugin DiscourseDemocracy

    before_action :ensure_logged_in

    def index
    end
  end
end
