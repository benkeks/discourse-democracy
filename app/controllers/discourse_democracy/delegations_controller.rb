module DiscourseDemocracy
  class DelegationsController < ::ApplicationController
    requires_plugin DiscourseDemocracy

    before_action :ensure_logged_in

    def index
    end

    def delegate
      params.require(:user_name)
      params.require(:delegation_type)

      raise Discourse::InvalidAccess.new unless
        current_user && (current_user.username == params[:user_name] || current_user.staff?)
      raise Discourse::InvalidParameters.new "Users may not delegate to themselves." if
        (current_user.username == params[:proxy_name]) || (params[:user_name] == params[:proxy_name])

      if user = User.find_by(username: params[:user_name])
        if proxy = User.find_by(username: params[:proxy_name])
          updater = DiscourseDemocracy::DelegationsUpdater.new(user, proxy)
          updater.update(params[:delegation_type])
        elsif params[:proxy_name] == ""
          updater = DiscourseDemocracy::DelegationsUpdater.new(user, nil)
          updater.update(params[:delegation_type])
        end
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

    def poll
      params.require(:post_id)

      post = Post.find_by(id: params[:post_id])
      raise Discourse::InvalidParameters.new unless post.present?
      polls = Poll.includes(:poll_options).where(post: post)
      raise Discourse::InvalidParameters.new unless polls.present?

      if polls && (mandates = post.dem_proxy_mandates)
        object = polls.map do |poll|
          if poll.visibility == "everyone"
            user_poll_votes =
              poll
                .poll_votes
                .joins(:poll_option, :user)
                .select('poll_options.digest,users.username,user_id,poll_option_id')
            poll_delegated_votes = user_poll_votes.flat_map do |vote|
              if proxys_mandates = mandates["#{poll.id},#{vote.user_id}"]
                # select all ids of users who delegated their vote to a voter but did not (yet) cast votes in this poll themselves.
                additional_vote_ids = proxys_mandates.select do |mandator_id|
                  !user_poll_votes.any? { |vote|
                    vote.user_id.to_s == mandator_id
                  }
                end
                # trim to maximal effective delegations per proxy vote
                additional_vote_ids = additional_vote_ids.take(SiteSetting.discourse_democracy_max_effective_delegations)
                # also return info on the voters whose votes were decided by proxy
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
          else
            [poll.name, []]
          end
        end.to_h
      else
        {}
      end

      render json: MultiJson.dump(object)
    end
  end
end
