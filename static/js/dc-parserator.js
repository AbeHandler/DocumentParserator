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


function currentPage() {
    if ((_.isUndefined($(".DV-currentPage").first().html())) && $(".DV-textContents").html().length > 0) {
        return 1; //if undefined then loader is on first page but there is text content (i.e. page displayed)
    } else {
        return parseInt($(".DV-currentPage").first().html());
    }
}


$("#tokens").on("click", function() {
    if ($(".DV-textContents").html().length == 0){
        $(".DV-trigger")[3].click();
    }
    else{
        var total_pages = parseInt($(".DV-totalPages").first().html()); //wont work when total pages = 0
        if ($(".DV-textContents").html().indexOf("<span ") == -1) {
            add_spans();
            load_handlers();
            check_for_labels();
        }
    }
});


function load_labels() {
    if (_.isUndefined(window.data)){
        return; //if window data has not been loaded (i.e. parserator is untrained or has not tagged this doc yet), skip this method. 
    }
    var current_page = currentPage();
    var matches = window.data.filters.page.getFn(current_page);
    var labels = window.data.get(matches.cids);
    $.each(labels, function(i, e) {
        if (e.label != "skip") {
            $("#" + e.id).attr("data-tag", e.label);
            var selected = _.filter(window.profiles.models, function(num) {
                return num.attributes.name == e.label;
            })[0];
            update_selected_label("#" + e.id, e.label);
        }
    });
}


function check_for_labels() {
    if (_.isUndefined(window.data)) {
        $.post("tags/" + $(".DV-container").first().attr("id").replace("DV-viewer-", ""), function(data) {
            if (data != ""){
                data = jQuery.parseJSON(data); //to do ... clean up so gets jquery from jserver
                window.data = new PourOver.Collection(data);
                var total_pages = $(".DV-totalPages").first().html();
                var range = _.range(1, total_pages + 1);
                var page_filter = PourOver.makeExactFilter("page", range);
                window.data.addFilters([page_filter])
                load_labels();
            }
        });
    } else {
        load_labels();
    }
}


$("#xmlify").on("click", function() {
    var json = JSON.stringify(values);
    var post_url = '/tokens/' + $(".DV-container").first().attr("id").replace("DV-viewer-", "");
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


function tokenize(text) {
    var regex = /\$[\d]+(\.\d)? billion|\w+|\$[\d\,]+(.\d\d)?/g;
    var tokens = [];
    var in_betweens = [];
    var last_index_remember = 0;
    var page = currentPage();
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
    load_labels();
    return tokens;
}


function re_write(tokens) {
    var output = "";
    $.each(tokens, function(i, token) {
        output += token;
    });
    return output;
}


function load_handlers() {
    load_token_handlers();
}


function add_spans() {
    if ($(".DV-textContents").html().indexOf("<span ") == -1) { //has not been tokenized 
        var tokens = tokenize($(".DV-textContents").html());
        var new_text = re_write(tokens);
        $(".DV-textContents").html(new_text);
    }
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