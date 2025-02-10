import { auth } from "@clerk/nextjs/server";
import MenuComp from "./MenuComp";



const Menu = async () => {

  const {sessionClaims}  = await auth();
  const role = (sessionClaims?.metadata as { role: string })?.role;
 
  return (
    <MenuComp role={role} />
  );
};
export default Menu;
