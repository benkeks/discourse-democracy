# frozen_string_literal: true

class DiscourseDemocracy::DelegationsUpdater
  # proxy = nil means that any delegations are to be removed
  def initialize(user, proxy)
    @user = user
    @proxy = proxy
  end
  
  def update(delegation_type)
    delegation_type = ActiveModel::Type::String.new.cast(delegation_type)
    # notification_level = Follow::Notification.levels[:watching]

    user_id = @user.id.to_s
    @user.dem_delegations ||= {}
    users_delegations = @user.dem_delegations
    users_delegations[delegation_type] ||= []

    # clear the old delegation (and its backlink)
    users_delegations[delegation_type].each do |old_proxy_id|
      old_proxy = User.find_by(id: old_proxy_id.to_i)
      old_proxy_mandates = old_proxy.dem_proxy_mandates
      old_proxy_mandates[delegation_type].delete(user_id) if old_proxy_mandates[delegation_type]
      old_proxy.custom_fields['dem_proxy_mandates'] = old_proxy_mandates
      old_proxy.save_custom_fields(true)
    end

    if @proxy
      proxy_id = @proxy.id.to_s
      @proxy.dem_proxy_mandates ||= {}
      proxys_mandates = @proxy.dem_proxy_mandates
      proxys_mandates[delegation_type] ||= []

      users_delegations[delegation_type] = [proxy_id]
      proxys_mandates[delegation_type].push(user_id) if proxys_mandates[delegation_type].exclude?(user_id)

      @proxy.custom_fields['dem_proxy_mandates'] = proxys_mandates
      @proxy.save_custom_fields(true)
    else
      users_delegations = []
    end

    @user.custom_fields['dem_delegations'] = users_delegations
    @user.save_custom_fields(true)

    if @proxy
      payload = {
        notification_type: Notification.types[:democracy_delegation],
        data: {
          display_username: @user.username,
        }.to_json
       }
      @proxy.notifications.create!(payload)
    end
  end
end