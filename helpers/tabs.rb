module Tabs
  # Adds class "current" if link points to current URL
  def tab_link_to link, url, opts = {}
    if current_page.url == url_for(url)
      opts[:class] = (opts[:class].to_s << ' current').lstrip
      opts[:style] = (opts[:style].to_s << ' pointer-events: none;').lstrip
    end
    link_to link, url, opts
  end
end
