<script lang="ts">
  import { page } from "$app/stores";
  import Notification from "$lib/components/Notification.svelte";
  import type { NotificationSchema } from "$lib/zod/schemas";
  import type { Notification as NotificationType } from "@prisma/client";
  import { flip } from "svelte/animate";
  import type { SuperValidated } from "sveltekit-superforms";
  import { superForm } from "sveltekit-superforms/client";

  export let notifications: NotificationType[];
  export let deleteForm: SuperValidated<NotificationSchema>;

  // Get the number of unread notifications, which is then used to indicate the user
  $: unreadCount = notifications.filter((data) => data.readAt == null).length;

  // this is a somewhat ugly way to keep focus on the bell button after a notification is removed
  // if this is not here, whenever an action is taken (such as removing a notification), the form will cause the elements to lose focus and the menu will close
  let bellButton: HTMLDivElement;
  const onDeleted = () => {
    bellButton.focus();
  };
  $: (() => {
    if ($page.form?.form?.data?.notificationId !== undefined) {
      // a notification was removed
      setTimeout(() => {
        // needs to be done next update cycle, otherwise it doesn' work. In practice, is still instant
        onDeleted();
      });
    }
  })();

  const { enhance } = superForm(deleteForm, {
    onUpdate: onDeleted,
    id: "deleteNotification",
  });
  const { enhance: readEnhance } = superForm(deleteForm, {
    id: "readNotifications",
  });
</script>

<div class="dropdown">
  <!-- When user clicks on the bell icon, it will update all notifications as read -->
  <div
    bind:this={bellButton}
    tabindex="0"
    class="btn btn-ghost *:text-xl"
    role="button"
    data-dropdown-toggle="dropdown"
  >
    {#if unreadCount <= 0}
      <span class="i-mdi-bell-outline" />
    {/if}
    {#if unreadCount > 0}
      <span class="i-mdi-bell-ring-outline animate-bounce" />
      <span
        class="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-box bg-red-600 text-center !text-sm"
        >{unreadCount}</span
      >
    {/if}
  </div>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <ul
    tabindex="0"
    class="menu dropdown-content !fixed right-0 z-[1] w-full overflow-clip rounded-box bg-base-100 p-0 shadow sm:w-96"
  >
    {#if notifications.length >= 1}
      {#each notifications as notification (notification.id)}
        <li animate:flip={{ duration: 200 }}>
          <Notification {notification} {deleteForm} />
        </li>
      {/each}
      <!-- Read all notifications (notifications are read on visit otherwise) -->
      {#if notifications?.filter((n) => n.readAt === null)?.length > 0}
        <form
          method="POST"
          action="/notifications?/readNotifications"
          use:readEnhance
          data-sveltekit-keepfocus
        >
          <button
            class="btn btn-ghost no-animation z-10 w-full rounded-none border-0 border-t border-gray-700 *:text-2xl"
          >
            Markera alla som lästa <span class="i-mdi-bell-check-outline" />
          </button>
        </form>
      {/if}
      <!-- Deletes all notifications -->
      <form
        method="POST"
        action="/notifications?/deleteNotification"
        use:enhance
        data-sveltekit-keepfocus
      >
        {#each notifications as notification (notification.id)}
          <input type="hidden" name="notificationIds" value={notification.id} />
        {/each}
        <button
          class="btn btn-ghost no-animation z-10 w-full rounded-none border-0 border-t border-gray-700 *:text-2xl"
        >
          Radera alla <span class="i-mdi-delete-outline" />
        </button>
      </form>
    {:else}
      <li class="p-4 after:bg-slate-100">Du har inga notiser!</li>
    {/if}
  </ul>
</div>
