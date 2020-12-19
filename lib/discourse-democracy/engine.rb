module DiscourseDemocracy
  class Engine < ::Rails::Engine
    engine_name "DiscourseDemocracy".freeze
    isolate_namespace DiscourseDemocracy

    config.after_initialize do
      Discourse::Application.routes.append do
        mount ::DiscourseDemocracy::Engine, at: "/discourse-democracy"
      end
    end
  end
end
