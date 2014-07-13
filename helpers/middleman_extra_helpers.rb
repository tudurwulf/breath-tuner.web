module MiddlemanExtraHelpers
  # Adds class "current" if link points to current URL
  def tab_link_to link, url, opts = {}
    if current_page.url == url_for(url)
      opts[:class] = (opts[:class].to_s << ' current').lstrip
      opts[:style] = (opts[:style].to_s << ' pointer-events: none;').lstrip
    end
    link_to link, url, opts
  end

  # Renders a stylesheet asset within <style> tags
  def stylesheet basename
    content_tag :style do
      # Requires `.chomp` for proper minification
      sprockets[ "#{basename}.css" ].to_s.chomp
    end
  end

  # Renders a javascript asset within <script> tags
  def javascript basename
    content_tag :script do
      # Requires `.chomp` for proper minification
      sprockets[ "#{basename}.js" ].to_s.chomp
    end
  end
end
