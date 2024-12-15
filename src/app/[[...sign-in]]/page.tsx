"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {

  const { isLoaded, isSignedIn, user } = useUser();
  console.log(user);
  const router = useRouter();

  useEffect(() => {
    const role = user?.publicMetadata.role;
    if (role) {
      router.push(`/${role}`);
    }
  }, [user, router])
  

  return (
    <div className=" h-screen flex justify-center items-center bg-lamaSky">
      <SignIn.Root>
        <SignIn.Step
          name="start"
          className=" bg-white p-12 flex flex-col gap-2 rounded-md shadow-xl"
        >
          <h1 className=" font-bold text-xl flex items-center gap-2">
            <Image src={"/logo.png"} alt="Logo" width={24} height={24} />
            SchoolLS
          </h1>
          <h2>Connectez vous à votre compte</h2>
          <Clerk.GlobalError className=" text-sm text-red-400" />
          <Clerk.Field name={"identifier"} className=" flex flex-col gap-2">
            <Clerk.Label className=" text-xs text-gray-500">
              Nom d&apos;utilisateur
            </Clerk.Label>
            <Clerk.Input
              type="text"
              required
              className=" p-2 rounded-md ring-1 ring-gray-300"
            />
            <Clerk.FieldError className=" text-xs text-red-400" />
          </Clerk.Field>
          <Clerk.Field name={"password"} className=" flex flex-col gap-2">
            <Clerk.Label className=" text-xs text-gray-500">
              Mot de passe
            </Clerk.Label>
            <Clerk.Input
              type="password"
              required
              className=" p-2 rounded-md ring-1 ring-gray-300"
            />
            <Clerk.FieldError className=" text-xs text-red-400" />
          </Clerk.Field>
          <SignIn.Action
            submit
            className=" bg-blue-500 text-white my-1 rounded-md text-sm p-[10px]"
          >
            Se connecter
          </SignIn.Action>
        </SignIn.Step>
      </SignIn.Root>
    </div>
  );
};
export default LoginPage;
