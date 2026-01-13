import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const plans = [
  { id: "starter", name: "Starter", price: 50, features: ["Basic Analytics", "5 Posts/month"] },
  { id: "intermediate", name: "Intermediate", price: 100, features: ["Advanced Analytics", "20 Posts/month", "Priority Support"] },
  { id: "pro", name: "Pro", price: 150, features: ["Full Analytics", "Unlimited Posts", "Dedicated Manager"] },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      plan: "free",
    },
  });

  const onNext = () => {
    if (step === 1) setStep(2);
  };

  const onSubmit = async (data: any) => {
    if (!selectedPlan) {
      toast({ title: "Please select a plan", variant: "destructive" });
      return;
    }

    try {
      await apiRequest("POST", "/api/onboarding", { ...data, plan: selectedPlan });
      toast({ title: "Welcome!", description: "Your trial has started." });
      setLocation("/dashboard");
    } catch (e) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Welcome! Let's get started</CardTitle>
          <CardDescription>Step {step} of 2</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>${plan.price}/month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4" /> {f}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 2 && <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>}
          <div className="ml-auto">
            {step === 1 ? (
              <Button onClick={onNext}>Next: Select Plan</Button>
            ) : (
              <Button onClick={form.handleSubmit(onSubmit)}>Start 7-Day Free Trial</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
