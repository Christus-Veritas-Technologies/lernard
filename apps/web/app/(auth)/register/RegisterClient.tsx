"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { Mail01Icon, LockPasswordIcon, User02Icon } from "hugeicons-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthApiError } from "@/lib/auth-client";
import { useRegisterMutation } from "@/hooks/useAuthMutations";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" as const },
    },
};

export function RegisterClient() {
    const router = useRouter();
    const { mutate, isPending, isError, error } = useRegisterMutation();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [accountType, setAccountType] = useState<"student" | "guardian">("student");
    const [fieldErrors, setFieldErrors] = useState<{
        name?: string;
        email?: string;
        password?: string;
    }>({});

    function validate() {
        const errors: typeof fieldErrors = {};
        if (!name.trim()) errors.name = "Name is required";
        else if (name.trim().length > 50) errors.name = "Name must be 50 characters or fewer";
        if (!email) errors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
        if (!password) errors.password = "Password is required";
        else if (password.length < 8) errors.password = "Password must be at least 8 characters";
        return errors;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        mutate(
            { name: name.trim(), email: email.trim().toLowerCase(), password, accountType },
            {
                onSuccess: () => {
                    if (accountType === "guardian") {
                        router.push("/home");
                    } else {
                        router.push("/profile-setup");
                    }
                },
            },
        );
    }

    const apiError =
        isError && error instanceof AuthApiError
            ? error.message
            : isError
                ? "Something went wrong. Please try again."
                : null;

    return (
        <motion.div
            className="flex flex-col gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-text-primary">Create account</h1>
                <p className="mt-1 text-text-secondary">Start your learning journey with Lernard.</p>
            </motion.div>

            {/* Account type toggle */}
            <motion.div variants={itemVariants}>
                <Tabs value={accountType} onValueChange={(value: string) => setAccountType(value as "student" | "guardian")}>
                    <TabsList className="w-full">
                        <TabsTrigger value="student" className="flex-1">
                            Student
                        </TabsTrigger>
                        <TabsTrigger value="guardian" className="flex-1">
                            Guardian
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </motion.div>

            <motion.form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" variants={itemVariants}>
                {apiError && (
                    <div className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error">
                        {apiError}
                    </div>
                )}

                <AuthField
                    label="Full name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    error={fieldErrors.name}
                    icon={<User02Icon size={18} />}
                />

                <AuthField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    error={fieldErrors.email}
                    icon={<Mail01Icon size={18} />}
                />

                <AuthField
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    error={fieldErrors.password}
                    icon={<LockPasswordIcon size={18} />}
                />

                <motion.button
                    type="submit"
                    disabled={isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                    {isPending ? "Creating account..." : "Create account"}
                </motion.button>
            </motion.form>

            <motion.div className="flex flex-col gap-2.5" variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button asChild variant="secondary" className="w-full h-12 text-sm font-semibold">
                        <Link href="/login">
                            Already have an account? Log in
                        </Link>
                    </Button>
                </motion.div>

                <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-text-tertiary">or</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <GoogleSignInButton />
            </motion.div>
        </motion.div>
    );
}
