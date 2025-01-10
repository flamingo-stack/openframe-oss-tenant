package ai.openframe.analysis.model;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

public record Contributor(
        String username,
        String name,
        String url,
        String email,
        String linkedin,
        String website,
        int totalCommits,
        long javaRepos,
        int starsReceived,
        int totalStars,
        int totalForks,
        Instant latestCommitDate) implements Comparable<Contributor> {

    public double calculateRankScore() {
        double recency = latestCommitDate != null ? 
            1.0 + (latestCommitDate.getEpochSecond() - Instant.now().minus(365, ChronoUnit.DAYS).getEpochSecond()) / (365.0 * 24 * 60 * 60) : 0;
        return totalCommits * (starsReceived + 1) * recency;
    }

    @Override
    public int compareTo(Contributor other) {
        return Double.compare(other.calculateRankScore(), this.calculateRankScore());
    }
}
