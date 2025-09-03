package pageObjects;

public interface FormInteractions {
    
    /**
     * Fill all required fields in the form
     * @param data form data object
     */
    void fillForm(Object data);
    
    /**
     * Clear all form fields
     */
    void clearForm();
    
    /**
     * Validate form data
     * @return true if form is valid
     */
    boolean validateForm();
    
    /**
     * Submit the form
     */
    void submitForm();
    
    /**
     * Check if form is complete (all required fields filled)
     * @return true if form is complete
     */
    boolean isFormComplete();
    
    /**
     * Get form validation errors
     * @return array of error messages
     */
    String[] getValidationErrors();
}

