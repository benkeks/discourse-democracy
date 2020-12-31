# require_dependency "discourse_democracy_constraint"

Discourse::Application.routes.append do
  #mount ::DiscourseDemocracy::Engine, at: "discourse_democracy"
  %w{users u}.each_with_index do |root_path, index|
    get "#{root_path}/:username/delegations" => "discourse_democracy/delegations#index", constraints: { username: RouteFormat.username }
  end

  put '/discourse-democracy/delegations/delegate' => 'discourse_democracy/delegations#delegate'
  get '/discourse-democracy/delegations/list/:username' => 'discourse_democracy/delegations#list', constraints: { username: RouteFormat.username }
  get '/discourse-democracy/delegations/poll/:post_id' => 'discourse_democracy/delegations#poll'
end
