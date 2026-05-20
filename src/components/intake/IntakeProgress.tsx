const STEPS = [
  'Your Details',
  'Session Preferences',
  'About You',
  'Other Support',
  'Emergency Contact',
  'Consent',
];

export default function IntakeProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <p
        className="text-xs font-normal uppercase mb-2"
        style={{ color: '#C85A1A', letterSpacing: '2px' }}
      >
        Step {currentStep} of {STEPS.length}
      </p>
      <div className="w-full h-0.5 rounded-full bg-gray-200 mb-3">
        <div
          className="h-0.5 rounded-full transition-all duration-500"
          style={{
            width: `${(currentStep / STEPS.length) * 100}%`,
            backgroundColor: '#4F8A68',
          }}
        />
      </div>
      <h2 className="font-heading font-light text-xl" style={{ color: '#2A4D3C' }}>
        {STEPS[currentStep - 1]}
      </h2>
    </div>
  );
}
