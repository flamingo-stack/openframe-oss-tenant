package ai.openframe.analysis.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Properties;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import ai.openframe.analysis.graphql.Field;
import ai.openframe.analysis.graphql.GitHubQueryBuilder;
import ai.openframe.analysis.graphql.SearchField;
import ai.openframe.analysis.model.Contributor;

public class GitHubService {

    private final String apiUrl;
    private final String token;
    private final HttpClient client;
    private final Gson gson;

    public GitHubService() {
        Properties props = new Properties();
        try (InputStream input = GitHubService.class.getClassLoader().getResourceAsStream("config.properties")) {
            props.load(input);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load configuration", e);
        }

        this.apiUrl = props.getProperty("github.api.url");
        this.token = props.getProperty("github.token");
        this.client = HttpClient.newHttpClient();
        this.gson = new GsonBuilder().create();
    }

    private String buildGitHubQuery(String cursor, String location) {
        GitHubQueryBuilder queryBuilder = new GitHubQueryBuilder()
                .searchUsers()
                .location("\\\"" + location + "\\\"")
                .language("Java")
                .cursor(cursor);

        // Get search field and add pageInfo
        SearchField searchField = queryBuilder.getSearchField();
        searchField.appendQuery("sort:repositories-desc"); // Sort by number of repositories in descending order

        Field pageInfo = searchField.addField("pageInfo");
        pageInfo.addField("hasNextPage");
        pageInfo.addField("endCursor");

        // Add nodes with User fragment
        Field nodes = searchField.addField("nodes");
        Field userFragment = nodes.addField("... on User");

        // Add basic user fields (as separate fields)
        userFragment.addField("login");
        userFragment.addField("name");
        userFragment.addField("url");
        userFragment.addField("email");
        userFragment.addField("websiteUrl");

        // Add contribution collection with specific time range
        Field contributions = userFragment.addField("contributionsCollection");
        contributions.addField("totalCommitContributions");
        contributions.addField("restrictedContributionsCount");
        
        // Add latest commit date from contribution calendar
        Field calendar = contributions.addField("contributionCalendar");
        calendar.addField("totalContributions");
        
        // Get latest commit date using contributions
        Field weeks = calendar.addField("weeks");
        Field contributionDays = weeks.addField("contributionDays");
        contributionDays.addField("date");
        contributionDays.addField("contributionCount");

        // Add repositories field with args
        Field repos = userFragment.addField("repositories")
                .addArg("first", 100)
                .addArg("isFork", false)
                .addArg("orderBy", "{field: PUSHED_AT, direction: DESC}");

        // Add repository details
        Field repoNodes = repos.addField("nodes");
        repoNodes.addField("name");
        repoNodes.addField("stargazerCount");
        repoNodes.addField("forkCount");

        Field primaryLang = repoNodes.addField("primaryLanguage");
        primaryLang.addField("name");

        return queryBuilder.build();
    }

    public List<Contributor> getTopJavaContributorsIn(String location) throws IOException, InterruptedException {
        List<Contributor> contributors = new ArrayList<>();
        String cursor = null;
        boolean hasNextPage = true;
        int pageCount = 0;
        final int MAX_PAGES = 10;

        while (hasNextPage && pageCount < MAX_PAGES) {
            System.out.printf("Fetching page %d/%d for %s...%n", pageCount + 1, MAX_PAGES, location);
            String query = buildGitHubQuery(cursor, location);
            System.out.println("\nGraphQL Query:");
            System.out.println("=============");
            System.out.println(query);
            System.out.println("=============\n");
            JsonObject response = executeGraphQLQuery(query);

            if (response.has("errors") || !response.has("data")) {
                throw new RuntimeException("GraphQL Error in response: " + response);
            }

            JsonObject search = response.getAsJsonObject("data")
                    .getAsJsonObject("search");

            List<Contributor> tempContributors = new ArrayList<>();
            processUsers(search.getAsJsonArray("nodes"), tempContributors);
            contributors.addAll(tempContributors);
            System.out.printf("Found %d Java contributors on page %d%n", tempContributors.size(), pageCount + 1);

            JsonObject pageInfo = search.getAsJsonObject("pageInfo");
            hasNextPage = pageInfo.get("hasNextPage").getAsBoolean();
            JsonElement endCursor = pageInfo.get("endCursor");
            cursor = endCursor.isJsonNull() ? null : endCursor.getAsString();
            pageCount++;
        }

        Collections.sort(contributors);
        return contributors;
    }

    private JsonObject executeGraphQLQuery(String query) throws IOException, InterruptedException {
        int maxRetries = 5;
        int retryCount = 0;
        long retryDelay = 1000; // Start with 1 second

        while (true) {
            try {
                // Create proper JSON structure for the query
                JsonObject queryJson = new JsonObject();
                queryJson.addProperty("query", query);
                String jsonBody = gson.toJson(queryJson);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(apiUrl))
                        .header("Authorization", "bearer " + token)
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(30))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                JsonObject jsonResponse = JsonParser.parseString(response.body()).getAsJsonObject();

                // Check for secondary rate limit
                if (jsonResponse.has("message") && 
                    jsonResponse.get("message").getAsString().contains("secondary rate limit")) {
                    if (retryCount >= maxRetries) {
                        throw new RuntimeException("Max retries exceeded after secondary rate limit");
                    }
                    System.out.printf("Hit secondary rate limit. Waiting %d seconds before retry %d/%d...%n", 
                                    retryDelay/1000, retryCount + 1, maxRetries);
                    Thread.sleep(retryDelay);
                    retryDelay *= 2; // Exponential backoff
                    retryCount++;
                    continue;
                }

                // Check for timeout error
                if (jsonResponse.has("message") &&
                    jsonResponse.get("message").getAsString().contains("couldn't respond to your request in time")) {
                    if (retryCount >= maxRetries) {
                        throw new RuntimeException("Max retries exceeded after timeout errors");
                    }
                    Thread.sleep(retryDelay);
                    retryDelay *= 2;
                    retryCount++;
                    continue;
                }

                return jsonResponse;
            } catch (IOException e) {
                if (e.getMessage().contains("RST_STREAM") && retryCount < maxRetries) {
                    Thread.sleep(retryDelay);
                    retryDelay *= 2;
                    retryCount++;
                    continue;
                }
                throw e;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw e;
            }
        }
    }

    private void processUsers(JsonArray users, List<Contributor> contributors) {
        for (JsonElement userElement : users) {
            JsonObject user = userElement.getAsJsonObject();
            JsonObject reposObj = user.getAsJsonObject("repositories");
            if (reposObj == null) {
                continue;
            }

            JsonArray repositories = reposObj.getAsJsonArray("nodes");
            if (repositories == null) {
                continue;
            }

            long javaRepos = countJavaRepositories(repositories);
            if (javaRepos > 0) {
                String login = user.get("login").getAsString();
                String name = user.get("name").isJsonNull() ? "Unknown" : user.get("name").getAsString();
                String email = user.get("email").isJsonNull() ? "" : user.get("email").getAsString();
                String website = user.get("websiteUrl").isJsonNull() ? "" : user.get("websiteUrl").getAsString();

                JsonObject contributionsObj = user.getAsJsonObject("contributionsCollection");
                int totalCommits = contributionsObj != null
                        ? contributionsObj.get("totalCommitContributions").getAsInt() : 0;

                // Get latest commit date from contribution calendar
                Instant latestCommitDate = null;
                if (contributionsObj != null && contributionsObj.has("contributionCalendar")) {
                    JsonObject calendar = contributionsObj.getAsJsonObject("contributionCalendar");
                    JsonArray weeks = calendar.getAsJsonArray("weeks");
                    
                    // Find the latest contribution date
                    String latestDate = null;
                    for (JsonElement weekElement : weeks) {
                        JsonObject week = weekElement.getAsJsonObject();
                        JsonArray days = week.getAsJsonArray("contributionDays");
                        for (JsonElement dayElement : days) {
                            JsonObject day = dayElement.getAsJsonObject();
                            if (day.get("contributionCount").getAsInt() > 0) {
                                latestDate = day.get("date").getAsString();
                            }
                        }
                    }
                    
                    if (latestDate != null) {
                        latestCommitDate = Instant.parse(latestDate + "T00:00:00Z");
                    }
                }

                // Calculate stars received from Java repositories only
                int starsReceived = calculateStarsReceived(repositories);

                contributors.add(new Contributor(
                        login,
                        name,
                        user.get("url").getAsString(),
                        email,
                        "", // LinkedIn field (empty by default)
                        website,
                        totalCommits,
                        javaRepos,
                        starsReceived,
                        calculateTotalStars(repositories),
                        calculateTotalForks(repositories),
                        latestCommitDate
                ));
            }
        }
    }

    private long countJavaRepositories(JsonArray repositories) {
        return repositories.asList().stream()
                .filter(repo -> repo.getAsJsonObject().has("primaryLanguage")
                && !repo.getAsJsonObject().get("primaryLanguage").isJsonNull()
                && repo.getAsJsonObject().getAsJsonObject("primaryLanguage")
                        .get("name").getAsString().equals("Java"))
                .count();
    }

    private int calculateTotalStars(JsonArray repositories) {
        return repositories.asList().stream()
                .mapToInt(repo -> repo.getAsJsonObject().get("stargazerCount").getAsInt())
                .sum();
    }

    private int calculateTotalForks(JsonArray repositories) {
        return repositories.asList().stream()
                .mapToInt(repo -> repo.getAsJsonObject().get("forkCount").getAsInt())
                .sum();
    }

    private int calculateStarsReceived(JsonArray repositories) {
        return repositories.asList().stream()
                .filter(repo -> {
                    JsonObject repoObj = repo.getAsJsonObject();
                    return repoObj.has("primaryLanguage") 
                        && !repoObj.get("primaryLanguage").isJsonNull()
                        && repoObj.getAsJsonObject("primaryLanguage")
                            .get("name").getAsString().equals("Java");
                })
                .mapToInt(repo -> repo.getAsJsonObject().get("stargazerCount").getAsInt())
                .sum();
    }
}
