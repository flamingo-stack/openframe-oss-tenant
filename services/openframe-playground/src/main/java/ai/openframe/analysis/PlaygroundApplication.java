package ai.openframe.analysis;

import ai.openframe.analysis.service.GitHubService;

public class PlaygroundApplication {

    public static void main(String[] args) {
        GitHubService service = new GitHubService();
        ContributorAnalyzer analyzer = new ContributorAnalyzer(service);

        analyzer.analyzeCities(
            "Miami",
            "Fort Lauderdale",
            "Miami Beach",
            "Boca Raton",
            "West Palm Beach",
            "Palm Beach",
            "Delray Beach",
            "Hialeah",
            "Pompano Beach",
            "Cape Coral",
            "Coral Springs",
            "Boynton Beach",
            "Deerfield Beach",
            "Belle Glade",
            "Lake Worth",
            "Palm Springs",
            "Greenacres"
        );
    }
}
