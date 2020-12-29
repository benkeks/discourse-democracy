module DiscourseDemocracy
  class DelegationsController < ::ApplicationController
    requires_plugin DiscourseDemocracy

    before_action :ensure_logged_in

    def index
    end

    def delegate
      params.require(:user_name)
      params.require(:proxy_name)
      params.require(:delegation_type)

      raise Discourse::InvalidAccess.new unless
        current_user && (current_user.username == params[:user_name] || current_user.staff?)
      raise Discourse::InvalidParameters.new "Users may not delegate to themselves." if
        (current_user.username == params[:proxy_name]) || (params[:user_name] == params[:proxy_name])

      if (proxy = User.find_by(username: params[:proxy_name])) && (user = User.find_by(username: params[:user_name]))
        updater = DiscourseDemocracy::DelegationsUpdater.new(user, proxy)
        updater.update(true, params[:delegation_type])
        render json: success_json
      else
        render json: failed_json
      end
    end

    def list
      params.require(:username)

      user = User.find_by(username: params[:username])
      raise Discourse::InvalidParameters.new unless user.present?

      delegations_serialized = user.dem_delegations.map do |delegation_type, delegate_ids|
        delegates = delegate_ids.map { |user_id| User.find(user_id) }
        [delegation_type, ActiveModel::ArraySerializer.new(delegates, each_serializer: BasicUserSerializer)]
      end
      mandates_serialized = user.dem_proxy_mandates.map do |delegation_type, mandator_ids|
        mandators = mandator_ids.map { |user_id| User.find(user_id) }
        [delegation_type, ActiveModel::ArraySerializer.new(mandators, each_serializer: BasicUserSerializer)]
      end

      render json: MultiJson.dump({delegations: delegations_serialized.to_h, mandates: mandates_serialized.to_h})
    end
  end
end
