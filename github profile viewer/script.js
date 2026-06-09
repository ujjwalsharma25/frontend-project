const form = document.querySelector("#searchForm");
const input = document.querySelector("#username");
const statusBox = document.querySelector("#status");
const profileCard = document.querySelector("#profileCard");
const repoList = document.querySelector("#repoList");

const fields = {
  avatar: document.querySelector("#avatar"),
  handle: document.querySelector("#handle"),
  name: document.querySelector("#name"),
  bio: document.querySelector("#bio"),
  repos: document.querySelector("#repos"),
  followers: document.querySelector("#followers"),
  following: document.querySelector("#following"),
  location: document.querySelector("#location"),
  company: document.querySelector("#company"),
  blog: document.querySelector("#blog"),
  joined: document.querySelector("#joined"),
  visitProfile: document.querySelector("#visitProfile")
};

const setStatus = (message, type = "info") => {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", type === "error");
};

const numberFormat = new Intl.NumberFormat("en");
const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

const fallback = (value, text = "Not available") => value || text;

const normalizeUrl = (url) => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderProfile = (user) => {
  fields.avatar.src = user.avatar_url;
  fields.avatar.alt = `${user.login} avatar`;
  fields.handle.textContent = `@${user.login}`;
  fields.name.textContent = user.name || user.login;
  fields.bio.textContent = fallback(user.bio, "This profile has no bio yet.");
  fields.repos.textContent = numberFormat.format(user.public_repos);
  fields.followers.textContent = numberFormat.format(user.followers);
  fields.following.textContent = numberFormat.format(user.following);
  fields.location.textContent = `Location: ${fallback(user.location)}`;
  fields.company.textContent = `Company: ${fallback(user.company)}`;
  fields.joined.textContent = `Joined: ${dateFormat.format(new Date(user.created_at))}`;
  fields.visitProfile.href = user.html_url;

  const blogUrl = normalizeUrl(user.blog);
  fields.blog.innerHTML = blogUrl
    ? `Website: <a href="${escapeHtml(blogUrl)}" target="_blank" rel="noreferrer">${escapeHtml(user.blog)}</a>`
    : "Website: Not available";

  profileCard.classList.remove("hidden");
};

const renderRepos = (repos) => {
  repoList.classList.remove("empty-state");

  if (!repos.length) {
    repoList.classList.add("empty-state");
    repoList.textContent = "No public repositories found for this profile.";
    return;
  }

  repoList.innerHTML = repos
    .map((repo) => {
      const language = repo.language ? escapeHtml(repo.language) : "Code";
      const stars = numberFormat.format(repo.stargazers_count);
      const forks = numberFormat.format(repo.forks_count);
      const updated = dateFormat.format(new Date(repo.updated_at));

      return `
        <article class="repo-card">
          <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a>
          <p>${escapeHtml(repo.description || "No description provided.")}</p>
          <div class="repo-foot">
            <span>${language}</span>
            <span>Stars ${stars}</span>
            <span>Forks ${forks}</span>
            <span>Updated ${updated}</span>
          </div>
        </article>
      `;
    })
    .join("");
};

const fetchGithubProfile = async (username) => {
  setStatus("Fetching profile...");
  profileCard.classList.add("hidden");
  repoList.className = "repo-list empty-state";
  repoList.textContent = "Loading repositories...";

  const userResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);

  if (userResponse.status === 404) {
    throw new Error("No GitHub user found with this username.");
  }

  if (!userResponse.ok) {
    throw new Error("GitHub API is not responding right now. Try again in a minute.");
  }

  const user = await userResponse.json();
  const repoResponse = await fetch(`${user.repos_url}?sort=updated&per_page=6`);
  const repos = repoResponse.ok ? await repoResponse.json() : [];

  renderProfile(user);
  renderRepos(repos);
  setStatus(`Showing public profile for @${user.login}.`);
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = input.value.trim();

  if (!username) {
    setStatus("Please enter a GitHub username.", "error");
    return;
  }

  try {
    await fetchGithubProfile(username);
  } catch (error) {
    profileCard.classList.add("hidden");
    repoList.className = "repo-list empty-state";
    repoList.textContent = "Search any username to see recent repositories here.";
    setStatus(error.message, "error");
  }
});

