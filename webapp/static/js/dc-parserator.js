/**
Sets up backbone collections and views
 */
(function() {
    var Profile = Backbone.Model.extend({
        setSelected: function() {
            this.collection.setSelected(this);
        },
        selected: null,
    });

    var ProfileList = Backbone.Collection.extend({
        model: Profile,
        url: "/static/json/tags.json",
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
                profile_json['cid'] = profile.cid;
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
})(jQuery);


/**
Simple object to store the value of each token
 */
values = {}


/**
Return HTML that wraps an ID in a span tag
 */
function viewer_has_loaded() {
    DV.viewers[_.keys(DV.viewers)[0]].api.onPageChange(function() {
        tokenize_current_page();
    });
}

/**
Returns true if span tags have already been added
 */
function current_page_has_span_tags() {
    var current_page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
    var page_text = DV.viewers[_.keys(DV.viewers)[0]].api.getPageText(current_page);
    if (page_text.indexOf("<span ") != -1) {
        return true;
    } else {
        return false;
    }
}

/**
Returns true if current page is undefined
i.e. the page is stil loading
 */
function current_page_is_undefined() {
    var current_page = DV.viewers[_.keys(DV.viewers)[0]].api.currentPage();
    var page_text = DV.viewers[_.keys(DV.viewers)[0]].api.getPageText(current_page);
    if (_.isUndefined(page_text)) {
        return true;
    } else {
        return false;
    }
}

/**
Will busy wait until the page is tokenized. 
Eventually it would be great to get a callback
from the DC viewer onPageLoad but it can't do that
yet.
 */
function tokenize_current_page() {

    //Viewer needs to be in text view or have been in text view 
    //Otherwise the viewer API won't give the text 
    if (DV.viewers[_.keys(DV.viewers)[0]].api.getState() != "ViewText") {
        return;
    }
    if (current_page_is_undefined()) {
        console.log("waiting 1/4 second for text to load");
        setTimeout(tokenize_current_page, 250);
    } else {
        if (!current_page_has_span_tags()) {
            insert_spans();
        }
        load_labels();
        load_token_handlers();
    }
}


/**
Adds labels from parserator to the span tags
-- but only if it can find them from the server
 */
function load_labels() {
    if (_.isUndefined(window.data)) {
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
then window.data will remain undefined. Tags come from Parserator
 */
function check_for_labels() {
    if (_.isUndefined(window.data)) {
        $.post("tags/" + $("#doc_cloud_id").attr("data-docid"), function(data) {
            if (data != "") {
                window.data = JSON.parse(data);
                var total_pages = DV.viewers[_.keys(DV.viewers)[0]].api.numberOfPages()
                var range = _.range(1, total_pages + 1);
            }
        });
    }
}


/**
Dumps tokens to the server so that it can generate 
Parserator-formatted XML
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

        url: post_url,
        success: function(ret) {
            window.location.href = ret;
        }
    });
});


/**
Gets the tags for a page. Implies tokenization
*/
function page_tokens(page_no){
    var post_url = '/get_tags/' + $("#doc_cloud_id").attr("data-docid") + '?page=' + page_no;
    $.post(post_url, function(data, status){
        alert("Data: " + data + "\nStatus: " + status);
    });
}


function is_page(page, id){
    var re = new RegExp(page + "-");
    return re.test(id);
}


/**
Insert span tags to a page in a document
 */
function insert_spans(text) {
    $.post("tags/1155681-perez-a-professional-corporation-contract-with?page=" + current_page, function(data){
        DV.viewers[_.keys(DV.viewers)[0]].api.setPageText(data, current_page);
        $(".DV-textContents").html(page_text_tokenized);
    }
}

/**
Set a label's data-tag and color
 */
function update_selected_label(id, name_class) {
    var model = window.profiles.findWhere({
        name: name_class
    });
    $(id).css("border", "2px solid rgb(" + model.get("red") + "," + model.get("green") + "," + model.get("blue") + ")");
    $(id).attr("data-tag", name_class);
}


/**
Add handlers for the token classes
 */
function load_token_handlers() {
    $(".token").on("click", function(event) {
        if (_.isUndefined(window.profiles.selected)) {
            alert("You must select a tag before you can label a token");
        } else {
            var name_class = window.profiles.selected.get("name").replace(" ", "_");
            if ($("#" + event.target.id).attr("data-tag") != "skip") { //toggle skip.
                name_class = "skip";
            }
            item = window.data.items.filter(function(v){return v.id === event.target.id})[0];
            item.label = name_class;
            update_selected_label("#" + event.target.id, name_class);
            var val = {}
            val['text'] = $("#" + event.target.id).html();
            val['value'] = name_class;
            values[event.target.id] = val;
        }
    });
}

check_for_labels();