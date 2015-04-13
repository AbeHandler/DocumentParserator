$(function() {
    var Profile = Backbone.Model.extend({
        setSelected: function() {
            this.collection.setSelected(this);
        },
        selected: null,
    });

    var ProfileList = Backbone.Collection.extend({
        model: Profile,
        url: "/static/json/profiles.json",
        selected: $.noop(),
        setSelected: function(jobSummary) {
            if (_.isUndefined(this.selected)) {
                $.noop(); //no operation if unselected
            } else {
                this.selected.set({
                    selected: false
                }); //turn off existing selected 
            }
            jobSummary.set({
                selected: true
            });
            this.selected = jobSummary;
        }
    });

    var ProfileView = Backbone.View.extend({
        el: "#categories",
        template: _.template($('#profileTemplate').html()),
        render: function(eventName) {
            _.each(this.model.models, function(profile) {
                var profile_json = profile.toJSON();
                profile_json['cid'] = profile.cid
                var profileTemplate = this.template(profile_json);
                $(this.el).append(profileTemplate);
                var number = "#" + profile.cid;
                var r = profile.get("red");
                var g = profile.get("green");
                var b = profile.get("blue");
                $(number).css({
                    background: "rgba(" + r + "," + g + "," + b + "," + .6 + ")"
                });
                $(number).css({
                    border: "1px solid rgb(" + r + "," + g + "," + b + ")"
                })
                profile.on('change:selected', function(model, color) {
                    if (_.isUndefined(profiles.selected)) {
                        $(number).css({
                            background: "rgb(" + r + "," + g + "," + b + ")"
                        });
                    } else if (profiles.selected.cid == model.cid) {
                        $(number).css({
                            background: "rgba(" + r + "," + g + "," + b + ", .6)"
                        }); //make it opaque
                    } else {
                        $(number).css({
                            background: "rgb(" + r + "," + g + "," + b + ")"
                        });
                    }
                });
            }, this);

            return this;
        }
    });

    window.profiles = new ProfileList();

    window.profiles.fetch();

    var profilesView = new ProfileView({
        model: profiles
    });

    window.profiles.fetch({
        success: function() {
            profilesView.render();
            $(".category").on("click", function(event) {
                var eid = event.target.id;
                if (event.target.tagName == "SPAN") {
                    eid = event.target.parentNode.id;
                }
                var model = window.profiles.get(eid);
                window.profiles.setSelected(model);
            });
        }
    });
});


values = {}


function span_wrap(m, id) {
    return "<span id=\"" + id + "\" class='token' data-tag='skip'>" + m + "</span>";
}


function viewer_has_loaded(){
    check_for_labels(); //check for labels before loading more
    DV.viewers[_.keys(DV.viewers)[0]].api.onPageChange(function(){
        tokenize_current_page();
    });
}


function current_page_has_span_tags(){
   var current_page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
   var page_text = DV.viewers[_.keys(DV.viewers)[0]].api.getPageText(current_page);
   if (page_text.indexOf("<span ") != -1){
       return true;
   }else{
       return false;
   }
}


function current_page_is_undefined(){
    var current_page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
    var page_text = DV.viewers[_.keys(DV.viewers)[0]].api.getPageText(current_page);
    if (_.isUndefined(page_text)){
        return true;
    }else{
        return false;
    }
}

function tokenize_current_page(){
    //You need to be in text view or have been in text view 
    //Otherwise the viewer API won't give the text 
    if (DV.viewers[_.keys(DV.viewers)[0]].api.getState() != "ViewText"){
        return;
    }
    if (current_page_is_undefined()){
        console.log("waiting 1/4 second for text to load");
        setTimeout(tokenize_current_page, 250);
    } else{
        if (!current_page_has_span_tags()){
            insert_spans();
        }
        load_labels();
        load_token_handlers();
    }
}



$("#tokens").on("click", function() {
    $("span:contains('Text')").click(); //click text tab
    tokenize_current_page();
});


function load_labels() {
    if (_.isUndefined(window.data)){
        return; //if window data has not been loaded (i.e. parserator is untrained or has not tagged this doc yet), skip this method. 
    }
    var current_page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
    var matches = window.data.filters.page.getFn(current_page);
    var labels = window.data.get(matches.cids);
    $.each(labels, function(i, e) {
        $("#" + e.id).attr("data-tag", e.label);
        var selected = _.filter(window.profiles.models, function(num) {
             return num.attributes.name == e.label;
        })[0];
        update_selected_label("#" + e.id, e.label);
    });
}

/**
Makes an attempt to get tags for the doc_cloud_id from the server. 
If it finds the tags, it loads them in window.data. If it doesn't
then window.data will remain undefined. 
 */
function check_for_labels() {
    if (_.isUndefined(window.data)) {
        $.post("tags/" + $("#doc_cloud_id").attr("data-docid"), function(data) {
            if (data != ""){
                data = jQuery.parseJSON(data); //to do ... clean up so gets jquery from jserver
                window.data = new PourOver.Collection(data);
                var total_pages = DV.viewers[_.keys(DV.viewers)[0]].api.numberOfPages()
                var range = _.range(1, total_pages + 1);
                var page_filter = PourOver.makeExactFilter("page", range);
                window.data.addFilters([page_filter])
            }
        });
    } 
}


/**
Dumps tokens to the server so that it can generate 
Parserator-ready json 
 */
$("#xmlify").on("click", function() {
    var json = JSON.stringify(values);
    var post_url = '/tokens/' + $("#doc_cloud_id").attr("data-docid");
    $.ajax({
        type: 'POST',
        // Provide correct Content-Type, so that Flask will know how to process it.
        contentType: 'application/json',
        // Encode data as JSON.
        data: json,

        url: post_url ,
        success: function(ret) {
            window.location.href = ret;
        }
    });
})


/**
This should probablyt happen on the client side. Parserator
should do it
 */
function tokenize(text) {
    var regex = /\$[\d]+(\.\d)? billion|\w+|\$[\d\,]+(.\d\d)?/g;
    var tokens = [];
    var in_betweens = [];
    var last_index_remember = 0;
    var page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
    var token_no = 0;
    while (matched = regex.exec(text)) {
        var token = text.substring(matched.index, regex.lastIndex);
        var id = page + "-" + token_no;
        var val = {}
        val['text'] = text.substring(matched.index, regex.lastIndex);
        val['value'] = "skip";
        token_no += 1;
        values[id] = val;
        token = span_wrap(token, id);
        var in_between = "";
        if (last_index_remember > 0) {
            in_between = text.substring(last_index_remember, matched.index);
        }
        last_index_remember = regex.lastIndex;
        tokens.push(in_between);
        tokens.push(token);
    }
    return tokens;
}


/**
Insert span tags to a page in a document
 */
function insert_spans(text) {
    if (current_page_has_span_tags()) { //already has span tags 
        return; 
    }
    var current_page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
    var page_text = DV.viewers[_.keys(DV.viewers)[0]].api.getPageText(current_page);
    var tokens = tokenize(page_text);
    var page_text_tokenized = "";
    $.each(tokens, function(i, token) {
        page_text_tokenized += token;
    });
        
    DV.viewers[_.keys(DV.viewers)[0]].api.setPageText(page_text_tokenized, current_page);
    $(".DV-textContents").html(page_text_tokenized);

}


function update_selected_label(id, name_class) {
    var model = window.profiles.findWhere({name: name_class});
    $(id).css("border", "2px solid rgb(" + model.get("red") + "," + model.get("green") + "," + model.get("blue") + ")");
    $(id).attr("data-tag", name_class);
}


function load_token_handlers() {
    $(".token").on("click", function(event) {
        if (_.isUndefined(window.profiles.selected)) {
            alert("You must select a tag before you can label a token");
        } else {
            var name_class = window.profiles.selected.get("name").replace(" ", "_");
            if ($("#" + event.target.id).attr("data-tag")!="skip"){  //toggle skip.
                 name_class = "skip";
            }
            update_selected_label("#" + event.target.id, name_class);
            var val = {}
            val['text'] = $("#" + event.target.id).html();
            val['value'] = name_class;
            values[event.target.id] = val;
        }
    });
}