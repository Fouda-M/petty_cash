import { WalletMinimal } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center space-x-2" data-ai-hint="logo finance">
      <WalletMinimal className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold text-primary tracking-tight">
        بوصلة العملات
      </span>
    </div>
  );
}
