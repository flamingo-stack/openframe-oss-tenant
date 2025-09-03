package pageObjects.dto;

/**
 * Data Transfer Object for organization registration
 * Following SRP: Single responsibility for holding registration data
 */
public class OrganizationRegistrationData {
    private String organizationName;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String confirmPassword;
    
    // Default constructor
    public OrganizationRegistrationData() {}
    
    // Constructor with all fields
    public OrganizationRegistrationData(String organizationName, String firstName, 
                                      String lastName, String email, String password) {
        this.organizationName = organizationName;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.confirmPassword = password; // Auto-confirm password
    }
    
    // Getters and Setters
    public String getOrganizationName() {
        return organizationName;
    }
    
    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public String getConfirmPassword() {
        return confirmPassword;
    }
    
    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }
    
    /**
     * Validate registration data
     * @return true if data is valid
     */
    public boolean isValid() {
        return organizationName != null && !organizationName.trim().isEmpty() &&
               firstName != null && !firstName.trim().isEmpty() &&
               lastName != null && !lastName.trim().isEmpty() &&
               email != null && !email.trim().isEmpty() && email.contains("@") &&
               password != null && password.length() >= 8 &&
               password.equals(confirmPassword);
    }
    
    @Override
    public String toString() {
        return "OrganizationRegistrationData{" +
                "organizationName='" + organizationName + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", email='" + email + '\'' +
                ", password='[HIDDEN]'" +
                '}';
    }
}

