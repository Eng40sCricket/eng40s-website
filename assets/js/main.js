document.addEventListener("DOMContentLoaded", () => {
    // Determine base path for GitHub Pages project sites.
    // On GitHub Pages, a project site is served under /<repo-name>/
    // so all absolute paths must be prefixed with /<repo-name>.
    // On a custom domain or local dev, the base path is empty.
    const getBasePath = () => {
        const path = window.location.pathname;
        const repoName = "eng40s-website";
        if (path.startsWith("/" + repoName + "/") || path === "/" + repoName) {
            return "/" + repoName;
        }
        return "";
    };
    const basePath = getBasePath();

    // Function to load HTML content into a target element
    const loadComponent = async (componentPath, targetId) => {
        try {
            const fullUrl = basePath + componentPath;
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error("HTTP error! status: " + response.status);
            }
            const html = await response.text();
            const target = document.getElementById(targetId);
            if (target) {
                target.innerHTML = html;

                // After injecting header/footer, fix root-relative paths inside them
                fixComponentPaths(target);

                // Re-run path highlighting after header is loaded
                if (targetId === "header-placeholder") {
                    highlightActiveNav();
                }
            }
        } catch (error) {
            console.error("Failed to load component from " + componentPath + ":", error);
        }
    };

    // Fix root-relative paths in dynamically loaded components (header/footer)
    // The header.html and footer.html use root-relative paths like /index.html, /assets/img/...
    // We need to prefix them with basePath for GitHub Pages.
    const fixComponentPaths = (container) => {
        if (!basePath) return; // No fix needed if basePath is empty

        // Fix all <a href="/..."> links (but not external links starting with http)
        container.querySelectorAll("a[href^='/']").forEach(el => {
            const href = el.getAttribute("href");
            if (!href.startsWith(basePath)) {
                el.setAttribute("href", basePath + href);
            }
        });

        // Fix all <img src="/..."> images
        container.querySelectorAll("img[src^='/']").forEach(el => {
            const src = el.getAttribute("src");
            if (!src.startsWith(basePath)) {
                el.setAttribute("src", basePath + src);
            }
        });
    };

    // Load header and footer
    loadComponent("/components/header.html", "header-placeholder");
    loadComponent("/components/footer.html", "footer-placeholder");

    // Path highlighting function
    const highlightActiveNav = () => {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll(".nav ul li a");
        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (!href || href.startsWith("http")) return; // Skip external links

            // Normalize both paths for comparison: remove trailing /index.html and trailing /
            const normalize = (p) => p.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
            const normalizedCurrent = normalize(currentPath);
            const normalizedHref = normalize(href);

            if (normalizedCurrent === normalizedHref) {
                link.classList.add("active");
            } else if (normalizedHref !== normalize(basePath) && normalizedCurrent.startsWith(normalizedHref + "/")) {
                link.classList.add("active");
            }
        });
    };

    // Mobile navigation toggle (using event delegation for dynamic header)
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("hamburger-menu")) {
            const navMenu = document.querySelector(".nav ul");
            if (navMenu) {
                navMenu.classList.toggle("open");
            }
        }
    });

    // ========== NEWS PAGE RENDERING ==========
    // News is the only local data-driven section remaining on the hub site.

    const featuredStoryContainer = document.getElementById("featured-story-container");
    const latestNewsGrid = document.getElementById("latest-news-grid");

    if (featuredStoryContainer || latestNewsGrid) {
        fetch(basePath + "/assets/data/news.json")
            .then(res => res.json())
            .then(data => renderNewsPage(data))
            .catch(err => console.error("Error loading news data:", err));
    }

    function renderNewsPage(news) {
        if (!featuredStoryContainer || !latestNewsGrid) return;

        var sortedNews = news
            .filter(function(n) { return n.date && !isNaN(new Date(n.date).getTime()); })
            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        if (sortedNews.length > 0) {
            var featuredStory = sortedNews[0];
            var imgUrl = featuredStory.imageUrl || "";
            if (imgUrl.startsWith("./")) {
                imgUrl = basePath + "/" + imgUrl.substring(2);
            } else if (imgUrl.startsWith("/")) {
                imgUrl = basePath + imgUrl;
            }

            featuredStoryContainer.innerHTML = '<div class="card story-card featured-story">'
                + '<img src="' + imgUrl + '" alt="' + featuredStory.title + '" class="story-image">'
                + '<div class="story-content">'
                + '<h2 class="story-title">' + featuredStory.title + '</h2>'
                + '<p class="story-date">' + new Date(featuredStory.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</p>'
                + '<p class="story-summary">' + featuredStory.summary + '</p>'
                + '<a href="' + basePath + '/news/story.html?id=' + featuredStory.id + '" class="btn btn-primary">Read More</a>'
                + '</div>'
                + '</div>';

            var latestNews = sortedNews.slice(1, 5);
            if (latestNews.length > 0) {
                latestNewsGrid.innerHTML = latestNews.map(function(story) {
                    var sImgUrl = story.imageUrl || "";
                    if (sImgUrl.startsWith("./")) {
                        sImgUrl = basePath + "/" + sImgUrl.substring(2);
                    } else if (sImgUrl.startsWith("/")) {
                        sImgUrl = basePath + sImgUrl;
                    }
                    return '<div class="card story-card">'
                        + '<img src="' + sImgUrl + '" alt="' + story.title + '" class="story-image">'
                        + '<div class="story-content">'
                        + '<h3 class="story-title">' + story.title + '</h3>'
                        + '<p class="story-date">' + new Date(story.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</p>'
                        + '<p class="story-summary">' + story.summary + '</p>'
                        + '<a href="' + basePath + '/news/story.html?id=' + story.id + '" class="btn btn-secondary">Read More</a>'
                        + '</div>'
                        + '</div>';
                }).join("");
            } else {
                latestNewsGrid.innerHTML = "<p>No other news available.</p>";
            }
        } else {
            featuredStoryContainer.innerHTML = '<p>News and updates coming soon. Follow us on social media for the latest from England Over 40s Cricket.</p>';
            latestNewsGrid.innerHTML = "";
        }
    }
});
