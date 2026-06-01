// news-badge.js
// Adds an unread dot to the News nav link when there is a news item newer
// than the visitor's last visit to /news/.
// The dot is cleared automatically when main.js runs on the news page
// (it writes eo40s_news_last_seen to localStorage on load).

(function () {
    var STORAGE_KEY = "eo40s_news_last_seen";

    // Determine basePath (mirrors logic in main.js)
    var path = window.location.pathname;
    var repoName = "eng40s-website";
    var basePath = (path.startsWith("/" + repoName + "/") || path === "/" + repoName)
        ? "/" + repoName
        : "";

    function addBadge() {
        // Find the News nav link by href fragment
        var links = document.querySelectorAll(".nav ul li a");
        links.forEach(function (link) {
            var href = link.getAttribute("href") || "";
            if (href.indexOf("/news/") !== -1 || href.indexOf("news/index") !== -1) {
                link.classList.add("has-new-news");
            }
        });
    }

    function checkForNewNews() {
        var lastSeen = null;
        try { lastSeen = localStorage.getItem(STORAGE_KEY); } catch (e) {}

        fetch(basePath + "/assets/data/news.json")
            .then(function (res) { return res.json(); })
            .then(function (news) {
                var active = news.filter(function (n) {
                    return !n.archived && n.date && !isNaN(new Date(n.date).getTime());
                });
                if (active.length === 0) return;

                active.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
                var newestDate = new Date(active[0].date);

                if (!lastSeen || newestDate > new Date(lastSeen)) {
                    addBadge();
                }
            })
            .catch(function () { /* fail silently — badge is non-critical */ });
    }

    // Run after header component is injected (main.js fires DOMContentLoaded,
    // then loads header via fetch; we poll briefly for the nav to appear).
    var attempts = 0;
    var interval = setInterval(function () {
        attempts++;
        var nav = document.querySelector(".nav ul");
        if (nav) {
            clearInterval(interval);
            checkForNewNews();
        }
        if (attempts > 20) clearInterval(interval); // give up after ~2 s
    }, 100);
})();
