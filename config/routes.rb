require_dependency "discourse_democracy_constraint"

DiscourseDemocracy::Engine.routes.draw do
  get "/" => "discourse_democracy#index", constraints: DiscourseDemocracyConstraint.new
  get "/actions" => "actions#index", constraints: DiscourseDemocracyConstraint.new
  get "/actions/:id" => "actions#show", constraints: DiscourseDemocracyConstraint.new
end
