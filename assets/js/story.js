document.addEventListener("DOMContentLoaded", function () {
    var basePath = (function () {
        var path = window.location.pathname;
        var repoName = "eng40s-website";
        if (path.startsWith("/" + repoName + "/") || path === "/" + repoName) {
            return "/" + repoName;
        }
        return "";
    })();

    var params = new URLSearchParams(window.location.search);
    var storyId = params.get("id");

    if (!storyId) {
        document.getElementById("story-container").innerHTML = "<p>Article not found.</p>";
        return;
    }

    // Load the news index to get metadata
    fetch(basePath + "/assets/data/news.json")
        .then(function (res) { return res.json(); })
        .then(function (news) {
            var story = news.find(function (n) { return n.id === storyId; });
            if (!story) {
                document.getElementById("story-container").innerHTML = "<p>Article not found.</p>";
                document.getElementById("story-headline").textContent = "Article Not Found";
                return;
            }

            // Set the page title and hero
            document.title = story.title + " - England Over 40s Cricket";
            document.getElementById("story-headline").textContent = story.title;
            var dateStr = new Date(story.date).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric"
            });
            document.getElementById("story-date-hero").textContent = dateStr;

            // Load the article HTML content
            var articleUrl = basePath + "/news/articles/" + storyId + ".html";
            return fetch(articleUrl).then(function (res) {
                if (!res.ok) throw new Error("Article content not found");
                return res.text();
            }).then(function (html) {
                var imgUrl = story.imageUrl || "";
                if (imgUrl.startsWith("/")) {
                    imgUrl = basePath + imgUrl;
                }

                var content = "";
                if (imgUrl) {
                    content += '<div class="story-featured-image">';
                    content += '<img src="' + imgUrl + '" alt="' + story.title + '">';
                    content += '</div>';
                }
                content += '<div class="story-body">' + html + '</div>';

                document.getElementById("story-container").innerHTML = content;
            });
        })
        .catch(function (err) {
            console.error("Error loading story:", err);
            document.getElementById("story-container").innerHTML = "<p>Unable to load article. Please try again later.</p>";
        });
});
