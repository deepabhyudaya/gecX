import React from "react";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function resolveTicket(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("id") as string);

  await prisma.ticket.update({
    where: { id },
    data: { status: "RESOLVED" },
  });

  revalidatePath("/admin/tickets");
}

export default async function AdminTicketsPage() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 h-full bg-[#fafafa]">
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center bg-white p-6 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px] rounded-[8px]">
          <div>
            <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">Support Tickets</h1>
            <p className="text-[16px] text-[#4d4d4d]">Manage password resets and support requests.</p>
          </div>
        </div>

        <div className="bg-white rounded-[8px] p-6 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="py-3 px-4 text-[#171717] font-semibold text-[14px]">ID</th>
                <th className="py-3 px-4 text-[#171717] font-semibold text-[14px]">Subject</th>
                <th className="py-3 px-4 text-[#171717] font-semibold text-[14px]">Description</th>
                <th className="py-3 px-4 text-[#171717] font-semibold text-[14px]">Date</th>
                <th className="py-3 px-4 text-[#171717] font-semibold text-[14px]">Status</th>
                <th className="py-3 px-4 text-[#171717] font-semibold text-[14px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-[#ebebeb] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                  <td className="py-4 px-4 text-[#4d4d4d] text-[14px]">#{ticket.id}</td>
                  <td className="py-4 px-4 text-[#171717] font-medium text-[14px]">{ticket.subject}</td>
                  <td className="py-4 px-4 text-[#4d4d4d] text-[14px] max-w-sm truncate">{ticket.description}</td>
                  <td className="py-4 px-4 text-[#4d4d4d] text-[14px]">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-[12px] font-medium ${
                      ticket.status === 'RESOLVED'
                        ? 'bg-[#ebf5ff] text-[#0068d6]'
                        : 'bg-[#ffeeea] text-[#ff5b4f]'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {ticket.status !== 'RESOLVED' && (
                      <form action={resolveTicket}>
                        <input type="hidden" name="id" value={ticket.id} />
                        <button
                          type="submit"
                          className="bg-transparent border-0 text-[#0072f5] hover:underline text-[14px] font-medium cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}

              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#4d4d4d] text-[14px]">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
