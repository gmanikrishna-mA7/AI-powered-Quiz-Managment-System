import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await api.requestPasswordReset(email);
            toast({
                title: "OTP Sent",
                description: "Please check your email for the verification code.",
            });
            setStep(2);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to send OTP. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const verifyOTPLocally = (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast({
                title: "Invalid OTP",
                description: "Please enter a valid 6-digit OTP",
                variant: "destructive"
            });
            return;
        }
        // API verifies OTP during reset, but we move to next step to unlock input
        setStep(3);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({
                title: "Passwords do not match",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await api.confirmPasswordReset(email, otp, newPassword);
            toast({
                title: "Success",
                description: "Your password has been reset successfully. Please login.",
            });
            navigate('/login', { state: { message: "Password reset successfully. Please login." } });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to reset password. Check OTP or try request again.",
                variant: "destructive",
            });
            if (error.message?.toLowerCase().includes('otp')) {
                setStep(2); // Go back to OTP if invalid
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-secondary/20 rounded-full blur-[80px] animate-pulse delay-700" />
                <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[90px] animate-pulse delay-1000" />
            </div>

            <Card className="w-full max-w-md z-10 border-primary/20 backdrop-blur-sm bg-card/90 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        {step === 1 ? 'Forgot Password?' : step === 2 ? 'Verify Email' : 'Reset Password'}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "Enter your email to receive a password reset code."}
                        {step === 2 && `Enter the 6-digit code sent to ${email}`}
                        {step === 3 && "Create a new strong password for your account."}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === 1 && (
                        <form onSubmit={handleRequestOTP} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full gradient-primary font-bold" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Code'}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={verifyOTPLocally} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Enter Verification Code</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="text-center text-2xl tracking-widest letter-spacing-2"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full gradient-primary font-bold">
                                Verify Code
                            </Button>
                            <div className="text-center mt-2">
                                <span className="text-xs text-muted-foreground">Did not receive code? </span>
                                <button type="button" onClick={() => setStep(1)} className="text-xs text-primary hover:underline">Resend</button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full gradient-primary font-bold" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reset Password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center border-t border-border/50 pt-4">
                    <Link to="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ForgotPassword;
