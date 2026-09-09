.Results[]? as $r
| $r.Vulnerabilities[]?
| [.Severity, .PkgName, .InstalledVersion, (.FixedVersion // "-"), .VulnerabilityID,
   (if $src == "" then $r.Target else $src end)]
| @tsv
