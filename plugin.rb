# frozen_string_literal: true

# name: DiscourseDemocracy
# about: Facilitate digital voting procedures in Discourse.
# version: 0.1
# authors: benkeks
# url: https://github.com/benkeks

register_asset 'stylesheets/common/discourse-democracy.scss'
register_asset 'stylesheets/desktop/discourse-democracy.scss', :desktop
register_asset 'stylesheets/mobile/discourse-democracy.scss', :mobile

enabled_site_setting :discourse_democracy_enabled

PLUGIN_NAME ||= 'DiscourseDemocracy'

load File.expand_path('lib/discourse-democracy/engine.rb', __dir__)
load File.expand_path('config/routes.rb', __dir__)


# register_editable_user_custom_field :my_preference 
# DiscoursePluginRegistry.serialized_current_user_fields << 'my_preference'

after_initialize do
  load File.expand_path('lib/discourse-democracy/delegations_updater.rb', __dir__)
  load File.expand_path('app/controllers/discourse_democracy/delegations_controller.rb', __dir__)
  # https://github.com/discourse/discourse/blob/master/lib/plugin/instance.rb

  #User.register_custom_field_type(:dem_delegations, :json)
  #User.register_custom_field_type(:dem_proxy_mandates, :json)
  #register_editable_user_custom_field :dem_delegations
  register_user_custom_field_type :dem_delegations, :string
  #register_editable_user_custom_field :dem_proxy_mandates
  register_user_custom_field_type :dem_proxy_mandates, :string
  
  add_to_class(:user, :dem_delegations) do
    custom_fields['dem_delegations'] && JSON.parse(custom_fields['dem_delegations']) || {}
  end
  
  add_to_class(:user, :dem_proxy_mandates) do
    custom_fields['dem_proxy_mandates'] && JSON.parse(custom_fields['dem_proxy_mandates']) || {}
  end

  add_to_serializer(:user, :dem_delegations) { object.dem_delegations }

  add_to_serializer(:user, :dem_proxy_mandates) { object.dem_proxy_mandates }

  add_to_serializer(:post, :polls_delegated_votes) do
    if preloaded_polls
      preloaded_polls.map do |poll|
        user_poll_votes =
          poll
            .poll_votes
            .joins(:poll_option, :user)
            .select('poll_options.digest,users.username,user_id,poll_option_id')

        poll_delegated_votes = user_poll_votes.flat_map do |vote|
          if proxy = User.find_by(id: vote['user_id'])
            # select all ids of users who delegated their vote to a voter but did not (yet) cast votes in this poll themselves.
            # TODO: It would be desirabe to “freeze” the delegations of a proxy for each poll, so that changes in delegations cannot change a voting result ex-post.
            additional_vote_ids = proxy.dem_proxy_mandates['*']&.select do |mandator_id|
              !user_poll_votes.any? { |vote| vote.user_id == mandator_id }
            end

            #additional_vote_ids.map { |id| User.find_by(id: id)) }
            delegated_votes_cast = User.where(id: additional_vote_ids).map { |u| UserNameSerializer.new(u).serializable_hash }
            if delegated_votes_cast && !delegated_votes_cast.empty?
              [{ delegated_votes: delegated_votes_cast, ids: additional_vote_ids, parent_vote: vote}]
            else
              []
            end
          else
            []
          end
        end
        
        [poll.name, poll_delegated_votes]
      end.to_h
    else
      {}
    end
  end


  module UserDestroyerDemocracyExtension
    # adapted from https://github.com/paviliondev/discourse-follow/blob/master/plugin.rb
    protected def prepare_for_destroy(user)
      user.dem_delegations.each do |delegation_type, user_ids|
        user_ids.each do |user_id|
          if proxy = User.find_by(id: user_id)
            updater = DiscourseDemocracy::DelegationsUpdater(user, proxy)
            updater.update(delegation_type, false)
          end
        end
      end
      user.dem_proxy_mandates.each do |delegation_type, user_ids|
        user_ids.each do |user_id|
          if mandator = User.find_by(id: user_id)
            updater = DiscourseDemocracy::DelegationsUpdater(mandator, user)
            updater.update(delegation_type, false)
          end
        end
      end
      super(user)
    end
  end

  class ::UserDestroyer
    prepend UserDestroyerDemocracyExtension
  end

end
