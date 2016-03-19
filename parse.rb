
def is_selector?(string='')
  # string.include?('##') ? true : false
  string =~ Regexp.union("##", "#@#")
end

def is_comment?(string='')
  string.start_with?('!') ? true : false
end

@list = {}

def try_block_domain(string='')
  if string.start_with?('|')
    string.gsub!('|', '')
    domain = string.sub(/(http:\/\/|https:\/\/)/, '').split(/[\/,^,*]/)[0]
    rules = string.sub!(domain, '').strip
    # puts "#{domain} ::: #{rules}" if rules.length == 1 # just plain fuck them
    # puts "#{domain} ::: #{rules}" if (rules[1] == '$') # most often fuck them
    # puts domain
    if (rules.length == 1 || rules[1] == '$')
      @list[domain] = true
    end
  elsif string.start_with?(':')
    # puts string
  elsif string.start_with?('@')
    string.gsub!('@', '')
    string.gsub!('|', '')
    # remove http(s):// to normalize
    domain = string.sub(/(http:\/\/|https:\/\/)/, '').split(/[\/,^,*]/)[0]
    @list[domain] = false
    # puts "#{domain} :: #{string}" if @list[domain]
  elsif string.end_with?('.')
    # puts string
  elsif string.start_with?('/')
    # puts string
  elsif string.start_with?('^', '?', '.com', '.net', '.org')
    # puts string
  elsif string =~ Regexp.union(".php", ".html", ".asp", ".js", ".gif", ".jpg", ".png")
    # puts string
  else
    # probably worthless
    # puts string
  end
end

filename = ARGV[0]

text = File.open(filename).read

text.each_line do |line|
  line.strip!
  next if is_selector?(line)
  next if is_comment?(line)
  try_block_domain(line)
end

puts @list.length
