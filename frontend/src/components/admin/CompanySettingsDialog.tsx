import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService, type Company } from '@/services/admin.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

// Labels + grouping for display only — the underlying keys must match the
// backend's WEIGHT_FIELD_MAP parameter keys exactly.
const WEIGHT_GROUPS: { title: string; params: { key: string; label: string }[] }[] = [
  {
    title: 'Critical Incidents',
    params: [
      { key: 'nearMissReport', label: 'Near Miss Report' },
      { key: 'firstAidInjury', label: 'First Aid Injury' },
      { key: 'medicalTreatmentInjury', label: 'Medical Treatment Injury' },
      { key: 'lostTimeInjury', label: 'Lost Time Injury' },
      { key: 'recordableIncidents', label: 'Recordable Incidents' },
    ],
  },
  {
    title: 'Compliance',
    params: [
      { key: 'nonComplianceRaised', label: 'Non-Compliance Raised' },
      { key: 'nonComplianceClose', label: 'Non-Compliance Close' },
      { key: 'overdueTrainings', label: 'Overdue Trainings' },
    ],
  },
  {
    title: 'Core Performance',
    params: [
      { key: 'manDays', label: 'Man Days' },
      { key: 'safeWorkHours', label: 'Safe Work Hours' },
      { key: 'safetyInduction', label: 'Safety Induction' },
      { key: 'toolBoxTalk', label: 'Tool Box Talk' },
      { key: 'jobSpecificTraining', label: 'Job Specific Training' },
      { key: 'formalSafetyInspection', label: 'Formal Safety Inspection' },
      { key: 'emergencyMockDrills', label: 'Emergency Mock Drills' },
      { key: 'internalAudit', label: 'Internal Audit' },
      { key: 'safetyObservationRaised', label: 'Safety Observation Raised' },
      { key: 'workforceTrainedPercent', label: 'Workforce Trained %' },
      { key: 'ppeObservations', label: 'PPE Observations' },
      { key: 'upcomingTrainings', label: 'Upcoming Trainings' },
    ],
  },
  {
    title: 'Documentation',
    params: [
      { key: 'safetyObservationClose', label: 'Safety Observation Close' },
      { key: 'workPermitIssued', label: 'Work Permit Issued' },
      { key: 'safeWorkMethodStatement', label: 'Safe Work Method Statement' },
    ],
  },
  {
    title: 'PPE Compliance',
    params: [{ key: 'ppeComplianceRate', label: 'PPE Compliance Rate' }],
  },
  {
    title: 'Environment Metrics',
    params: [
      { key: 'wasteGenerated', label: 'Waste Generated' },
      { key: 'wasteDisposed', label: 'Waste Disposed' },
      { key: 'energyConsumption', label: 'Energy Consumption' },
      { key: 'waterConsumption', label: 'Water Consumption' },
      { key: 'spillsIncidents', label: 'Spills Incidents' },
      { key: 'environmentalIncidents', label: 'Environmental Incidents' },
    ],
  },
  {
    title: 'Health & Hygiene',
    params: [
      { key: 'healthCheckupCompliance', label: 'Health Checkup Compliance' },
      { key: 'waterQualityTest', label: 'Water Quality Test' },
    ],
  },
];

// Plain-language labels for the six scoring directions. Keys must match the
// backend ScoreDirection enum exactly.
const DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'higher', label: 'Higher is better (Actual ÷ Target)' },
  { value: 'higherActivity', label: 'Leading — any activity scores full' },
  { value: 'lower', label: 'Lower is better (Target ÷ Actual)' },
  { value: 'zeroDecay', label: 'Target 0 — penalise each occurrence' },
  { value: 'zeroLeading', label: 'Target 0 — never penalised (encourage reporting)' },
  { value: 'rate', label: 'Incident rate (per hours worked)' },
];

const DIRECTION_LABEL: Record<string, string> = Object.fromEntries(
  DIRECTION_OPTIONS.map((o) => [o.value, o.label])
);

export default function CompanySettingsDialog({ isOpen, onClose, company }: Props) {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [directions, setDirections] = useState<Record<string, string>>({});
  const [directionDefaults, setDirectionDefaults] = useState<Record<string, string>>({});
  const [excellentAt, setExcellentAt] = useState<number>(90);
  const [goodAt, setGoodAt] = useState<number>(70);
  const [isCustom, setIsCustom] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['company-settings', company?.id],
    queryFn: () => adminService.getCompanySettings(company!.id),
    enabled: isOpen && !!company,
  });

  useEffect(() => {
    if (settingsResponse?.data) {
      const d = settingsResponse.data;
      setWeights(d.weights);
      setDirections(d.directions ?? {});
      setDirectionDefaults(d.directionDefaults ?? {});
      setExcellentAt(Number(d.excellentAt ?? 90));
      setGoodAt(Number(d.goodAt ?? 70));
      setIsCustom(d.isCustom);
      setSaveError('');
    }
  }, [settingsResponse]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminService.updateCompanySettings(company!.id, weights, { directions, excellentAt, goodAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', company?.id] });
      // Scores/labels across the dashboard depend on this config — drop cached metrics.
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      onClose();
    },
    onError: (err: any) => {
      setSaveError(err.response?.data?.message || 'Failed to save settings');
    },
  });

  const handleWeightChange = (key: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    setWeights((prev) => ({ ...prev, [key]: Number.isFinite(num) ? num : 0 }));
  };

  const handleDirectionChange = (key: string, value: string) => {
    setDirections((prev) => ({ ...prev, [key]: value }));
  };

  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValidSum = Math.abs(sum - 100) < 0.5;
  const isValidCutoffs = goodAt > 0 && goodAt < excellentAt && excellentAt <= 100;

  const handleSave = () => {
    setSaveError('');
    if (!isValidSum) {
      setSaveError(`Weights must sum to 100 — currently ${sum.toFixed(2)}`);
      return;
    }
    if (!isValidCutoffs) {
      setSaveError('Status cutoffs must satisfy 0 < Good < Excellent ≤ 100');
      return;
    }
    saveMutation.mutate();
  };

  const handleResetToDefaults = () => {
    // Defaults are already loaded once on the initial (isCustom=false) fetch;
    // re-fetching after invalidation gets the same result more simply.
    if (settingsResponse?.data?.isCustom === false) return;
    queryClient.invalidateQueries({ queryKey: ['company-settings', company?.id] });
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">Scoring Settings</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {company.companyName} — {isCustom ? 'custom settings configured' : 'using platform defaults'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading settings...</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status label cutoffs */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-700">Status Label Cutoffs</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Achievement % thresholds that set the Excellent / Good / Needs Attention labels and
                colours. These affect the labels only, not the underlying scores.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div>
                  <Label className="text-xs text-gray-500">Excellent ≥ (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={excellentAt}
                    onChange={(e) =>
                      setExcellentAt(e.target.value === '' ? 0 : parseFloat(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Good ≥ (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={goodAt}
                    onChange={(e) => setGoodAt(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </div>
              </div>
              {!isValidCutoffs && (
                <p className="text-xs text-red-600 mt-2">
                  Must satisfy 0 &lt; Good &lt; Excellent ≤ 100.
                </p>
              )}
            </div>

            {WEIGHT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.title}</h3>
                <div className="space-y-3">
                  {group.params.map(({ key, label }) => {
                    const dir = directions[key] ?? directionDefaults[key] ?? 'higher';
                    const isDefaultDir = dir === (directionDefaults[key] ?? 'higher');
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 md:grid-cols-[1fr_auto_5rem] gap-2 md:items-end"
                      >
                        <div>
                          <Label className="text-xs text-gray-500">{label}</Label>
                          <select
                            value={dir}
                            onChange={(e) => handleDirectionChange(key, e.target.value)}
                            className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            title={DIRECTION_LABEL[dir]}
                          >
                            {DIRECTION_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="hidden md:block text-[11px] text-gray-400 pb-2.5 self-center">
                          {isDefaultDir ? 'default' : 'customised'}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Weight</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={weights[key] ?? 0}
                            onChange={(e) => handleWeightChange(key, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-6 border-t bg-gray-50 sticky bottom-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Weights Total:{' '}
              <span className={isValidSum ? 'text-green-600' : 'text-red-600'}>
                {sum.toFixed(2)} / 100
              </span>
            </span>
            {isCustom && (
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reload from server
              </button>
            )}
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !isValidSum || !isValidCutoffs}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
