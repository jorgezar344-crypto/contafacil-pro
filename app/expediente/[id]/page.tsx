import { DetailPage } from "@/components/bro24/client-pages"; export default async function Page({params}:{params:Promise<{id:string}>}){return <DetailPage id={(await params).id}/>}
