package ai.openframe.analysis.graphql;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class GitHubQueryBuilder {
    private final List<SearchField> fields = new ArrayList<>();
    private final Map<String, Object> variables = new LinkedHashMap<>();
    
    public GitHubQueryBuilder searchUsers() {
        SearchField search = new SearchField("search")
            .addArg("type", SearchType.USER)
            .addArg("first", 10);
        fields.add(search);
        return this;
    }
    
    public GitHubQueryBuilder location(String location) {
        fields.get(0).appendQuery("location:" + location);
        return this;
    }
    
    public GitHubQueryBuilder language(String language) {
        fields.get(0).appendQuery("language:" + language);
        return this;
    }
    
    public GitHubQueryBuilder cursor(String cursor) {
        if (cursor != null) {
            fields.get(0).addArg("after", "\"" + cursor + "\"");
        }
        return this;
    }
    
    public GitHubQueryBuilder sort(String field, String direction) {
        fields.get(0).addArg("sort", field.toUpperCase());
        fields.get(0).addArg("direction", direction.toUpperCase());
        return this;
    }
    
    public SearchField getSearchField() {
        return fields.get(0);
    }
    
    public String build() {
        QuerySerializer serializer = new QuerySerializer();
        return serializer.serialize(new ArrayList<>(fields));
    }
}