package ai.openframe.analysis.graphql;

public class SearchField extends Field {

    private final StringBuilder queryBuilder = new StringBuilder();

    public SearchField(String name) {
        super(name);
    }

    public SearchField appendQuery(String queryPart) {
        if (queryBuilder.length() > 0) {
            queryBuilder.append(" ");
        }
        queryBuilder.append(queryPart);
        args.put("query", "\"" + queryBuilder.toString() + "\"");
        return this;
    }

    @Override
    public SearchField addArg(String key, Object value) {
        super.addArg(key, value);
        return this;
    }
}
