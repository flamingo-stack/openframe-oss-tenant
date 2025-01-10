package ai.openframe.analysis.graphql;

public enum SearchType {
    USER,
    REPOSITORY,
    ISSUE,
    DISCUSSION,
    CODE;

    @Override
    public String toString() {
        return name();
    }
} 