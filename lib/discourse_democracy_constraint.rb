class DiscourseDemocracyConstraint
  def matches?(request)
    SiteSetting.discourse_democracy_enabled
  end
end
