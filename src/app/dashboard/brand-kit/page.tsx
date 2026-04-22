import OnboardingWizard from '@/components/OnboardingWizard';

export const metadata = {
  title: 'Brand Kit | BrandPost AI',
};

export default function BrandKitPage() {
  return (
    <OnboardingWizard isDashboardMode={true} />
  );
}
