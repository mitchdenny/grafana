package commands

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/grafana/grafana/pkg/schema/load"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var defaultBaseLoadPaths = load.GetDefaultLoadPaths()

func TestValidateScuemataBasics(t *testing.T) {
	t.Run("Testing scuemata validity with valid cue schemas", func(t *testing.T) {
		tempDir := os.DirFS(filepath.Join("testdata", "valid_scuemata"))
		mergedFS := load.Merge(tempDir, defaultBaseLoadPaths.BaseCueFS)

		var baseLoadPaths = load.BaseLoadPaths{
			BaseCueFS:       mergedFS,
			DistPluginCueFS: defaultBaseLoadPaths.DistPluginCueFS,
		}

		err := validate(baseLoadPaths, load.BaseDashboardFamily)
		require.NoError(t, err, "error while loading base dashboard scuemata")

		err = validate(baseLoadPaths, load.DistDashboardFamily)
		require.NoError(t, err, "error while loading dist dashboard scuemata")
	})

	t.Run("Testing scuemata validity with invalid cue schemas - family missing", func(t *testing.T) {
		tempDir := os.DirFS(filepath.Join("testdata", "invalid_scuemata_missing_family"))
		mergedFS := load.Merge(tempDir, defaultBaseLoadPaths.BaseCueFS)

		var baseLoadPaths = load.BaseLoadPaths{
			BaseCueFS:       mergedFS,
			DistPluginCueFS: defaultBaseLoadPaths.DistPluginCueFS,
		}

		err := validate(baseLoadPaths, load.BaseDashboardFamily)
		assert.EqualError(t, err, "error while loading dashboard scuemata, err: dashboard schema family did not exist at expected path in expected file")
	})

	t.Run("Testing scuemata validity with invalid cue schemas - panel missing", func(t *testing.T) {
		tempDir := os.DirFS(filepath.Join("testdata", "invalid_scuemata_missing_panel"))
		mergedFS := load.Merge(tempDir, defaultBaseLoadPaths.BaseCueFS)

		var baseLoadPaths = load.BaseLoadPaths{
			BaseCueFS:       mergedFS,
			DistPluginCueFS: defaultBaseLoadPaths.DistPluginCueFS,
		}

		err := validate(baseLoadPaths, load.BaseDashboardFamily)
		require.NoError(t, err, "error while loading base dashboard scuemata")

		err = validate(baseLoadPaths, load.DistDashboardFamily)
		assert.EqualError(t, err, "all schema should be valid with respect to basic CUE rules, Family.lineages.0.0: field #Panel not allowed")
	})
}
