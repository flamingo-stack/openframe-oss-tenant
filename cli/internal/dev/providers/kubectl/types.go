package kubectl

// JSON structures for parsing kubectl output

type serviceJSON struct {
	Metadata struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
	} `json:"metadata"`
	Spec struct {
		Type  string `json:"type"`
		Ports []struct {
			Name       string      `json:"name"`
			Port       int32       `json:"port"`
			TargetPort interface{} `json:"targetPort"`
			Protocol   string      `json:"protocol"`
		} `json:"ports"`
	} `json:"spec"`
}

type serviceListJSON struct {
	Items []serviceJSON `json:"items"`
}