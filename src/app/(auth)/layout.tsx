import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAuth={false}>
      <div className=\"min-h-screen flex\">
        {/* Left side - Branding */}
        <div className=\"hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden\">
          <div className=\"absolute inset-0 bg-gradient-to-br from-primary to-primary/80\" />
          <div className=\"relative z-10 flex flex-col justify-center px-12 text-primary-foreground\">
            <div className=\"space-y-6\">
              <h1 className=\"text-4xl font-bold\">
                FriendFinder
              </h1>
              <p className=\"text-xl opacity-90\">
                Discover and connect with people nearby
              </p>
              <div className=\"space-y-4 text-sm opacity-80\">
                <div className=\"flex items-center space-x-3\">
                  <div className=\"w-2 h-2 rounded-full bg-current\" />
                  <span>GPS, Wi-Fi, and Bluetooth discovery</span>
                </div>
                <div className=\"flex items-center space-x-3\">
                  <div className=\"w-2 h-2 rounded-full bg-current\" />
                  <span>Real-time chat and video calls</span>
                </div>
                <div className=\"flex items-center space-x-3\">
                  <div className=\"w-2 h-2 rounded-full bg-current\" />
                  <span>Privacy-first design</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Auth forms */}
        <div className=\"flex-1 flex items-center justify-center px-6 py-12\">
          <div className=\"w-full max-w-md\">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}"