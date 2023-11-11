import { policyAccessGuard, withAccess } from "$lib/utils/access";
import apiNames from "$lib/utils/apiNames";
import prisma from "$lib/utils/prisma";
import { fail } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms/server";
import { z } from "zod";
import type { PageServerLoad } from "./$types";

const createSchema = z
  .object({
    role: z.string().optional(),
    studentId: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.role !== undefined || data.studentId !== undefined) &&
      (data.role === undefined || data.studentId === undefined),
    {
      message: "Either 'role' or 'studentId' must be defined",
    }
  );

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const load: PageServerLoad = async ({ parent, params }) => {
  const policies = await prisma.accessPolicy.findMany({
    where: {
      apiName: params.apiName,
    },
    include: {
      member: true,
    },
  }); // fetch it immidiately to reduce waterfall delay
  const { accessPolicies } = await parent();
  policyAccessGuard(apiNames.ACCESS_POLICY.READ, accessPolicies);
  const createForm = await superValidate(createSchema);
  const deleteForm = await superValidate(deleteSchema);
  return {
    policies,
    createForm,
    deleteForm,
  };
};

export const actions = {
  create: async ({ params, request, locals }) => {
    const form = await superValidate(request, createSchema);
    if (!form.valid) return fail(400, { form });
    const session = await locals.getSession();
    return withAccess(
      apiNames.ACCESS_POLICY.CREATE,
      session?.user,
      async () => {
        await prisma.accessPolicy.create({
          data: {
            apiName: params.apiName,
            role: form.data.role,
            studentId: form.data.studentId,
          },
        });
        return {
          success: true,
        };
      },
      form
    );
  },
  delete: async ({ request, locals }) => {
    const form = await superValidate(request, deleteSchema);
    if (!form.valid) return fail(400, { form });
    const session = await locals.getSession();
    return withAccess(
      apiNames.ACCESS_POLICY.DELETE,
      session?.user,
      async () => {
        await prisma.accessPolicy.delete({
          where: {
            id: form.data.id,
          },
        });
        return {
          success: true,
        };
      },
      form
    );
  },
};
