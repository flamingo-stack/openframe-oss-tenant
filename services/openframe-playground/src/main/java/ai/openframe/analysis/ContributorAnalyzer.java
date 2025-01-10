package ai.openframe.analysis;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

import ai.openframe.analysis.model.Contributor;
import ai.openframe.analysis.service.GitHubService;
import ai.openframe.analysis.service.GoogleSheetsService;

public class ContributorAnalyzer {
    private final GitHubService githubService;
    private final GoogleSheetsService sheetsService;

    public ContributorAnalyzer(GitHubService githubService) {
        this.githubService = githubService;
        try {
            this.sheetsService = new GoogleSheetsService();
        } catch (IOException | GeneralSecurityException e) {
            System.err.println("Error initializing Google Sheets service: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to initialize Google Sheets service", e);
        }
    }

    public void analyzeCities(String... cities) {
        for (String city : cities) {
            try {
                analyzeCity(city);
            } catch (Exception e) {
                System.err.println("Error analyzing " + city + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        // Create consolidated sheet after processing all cities
        try {
            System.out.println("\nCreating consolidated sheet for all cities...");
            sheetsService.createConsolidatedSheet();
        } catch (Exception e) {
            System.err.println("Error creating consolidated sheet: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void analyzeCity(String city) {
        try {
            List<Contributor> contributors = githubService.getTopJavaContributorsIn(city);
            displayTopContributors(contributors, city);
            
            // Ensure sheet exists and update data
            sheetsService.ensureSheetExists(city);
            sheetsService.updateContributors(contributors, city);
            
            System.out.println("\nData has been updated in Google Sheets!");
        } catch (IOException | InterruptedException e) {
            System.err.println("Error analyzing " + city + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void displayTopContributors(List<Contributor> contributors, String city) {
        System.out.println("\nTop Java Contributors in " + city + ":");
        System.out.println("=====================================");
        System.out.printf("%-20s %-20s %-45s %-10s %-10s %-10s %-10s%n",
                "Username", "Name", "URL", "Commits", "Repos", "Stars", "Forks");
        System.out.println("-------------------------------------");

        contributors.stream()
                .limit(20)
                .forEach(c -> System.out.printf("%-20s %-20s %-45s %-10d %-10d %-10d %-10d%n",
                c.username(), c.name(), c.url(), c.totalCommits(),
                c.javaRepos(), c.totalStars(), c.totalForks()));
    }
} 