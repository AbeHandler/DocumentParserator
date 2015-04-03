pages_html = {} 

function span_wrap(m, id){
   return "<span id=\"" + id +"\" class='token' data-tag='skip'>" + m + "</span>";
}


function currentPage(){
  if (_.isUndefined($(".DV-currentPage").first().html())){
    return $.noop();
  }else{
    return parseInt($(".DV-currentPage").first().html());
  }
}


$("#save").on("click", function(){
  pages_html[currentPage()] = $(".DV-textContents").html();
})


$("#tokens").on("click", function(){
  add_spans();
  load_handlers();
})


$("#load").on("click", function(){
  $(".DV-textContents").html(pages_html[currentPage()]);
})

$("#xmlify").on("click", function(){
  pages_html['id'] = $(".DV-container").first().attr("id").replace("DV-viewer-","");
  var json_string = JSON.stringify(pages_html);
  var url = "tokens/asd" //+ json_string;
  $.post(url, function(){
    console.log("w");
  });
})


function tokenize(text){
    var regex = /\$[\d]+(\.\d)? billion|\w+|\$[\d\,]+(.\d\d)?/g;
    var tokens = [];
    var in_betweens = [];
    var last_index_remember = 0;
    var page = currentPage();
    var token_no = 0;
    while (matched = regex.exec(text)) {
      var token = text.substring(matched.index, regex.lastIndex);
      var id = page + "-" + token_no;
      token_no += 1;
      token = span_wrap(token, id);
      var in_between = "";
      if (last_index_remember > 0){
        in_between = text.substring(last_index_remember, matched.index);
      }
      last_index_remember = regex.lastIndex;
      tokens.push(in_between);
      tokens.push(token);
    }
    return tokens;
}


function re_write(tokens){
    var output = "";
    $.each(tokens, function(i, token){
      output += token;
    });
    return output;
}


function load_handlers(){
  load_token_handlers();
}


function add_spans(){
  var tokens = tokenize($(".DV-textContents").html());
  var new_text = re_write(tokens);
  $(".DV-textContents").html(new_text);
}


var Page = Backbone.Model.extend({
  number:$.noop(),
  tokens: null,
  html:null
});


function update_selected_label(id){
  var red = window.profiles.selected.attributes.red;
  var green = window.profiles.selected.attributes.green;
  var blue = window.profiles.selected.attributes.blue;
  var name_class = window.profiles.selected.get("name").replace(" ", "_")
  $(id).css("border", "3px solid rgb(" + red + "," + green + "," + blue + ")");
  $(id).attr("data-tag", name_class);
}


function load_token_handlers(){
  $(".token").on("click", function(event){
    if (_.isUndefined(window.profiles.selected)){
      alert("You must select a tag before you can label a token");
    }else{
      update_selected_label("#" + event.target.id);
    }
  });
}


var DocCloudDocument = Backbone.Collection.extend({
  model: Page,
  hasPage: function(num){
    var pages = this.where({"number": num}).length;
    if (pages == 0){
      return false;
    }else if (pages==1){
      return true;
    }
  },
  current_page: null
});

window.doc = new DocCloudDocument;
